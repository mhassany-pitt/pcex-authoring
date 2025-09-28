import { ConfigService } from "@nestjs/config";
import { readFile } from "fs/promises";
import { ActivitiesService } from "src/activities-service/activities.service";
import { SourcesService } from "src/sources-service/sources.service";
import { storageRoot, transaction, useId } from "src/utils";
import { DataSource } from "typeorm";

type Params = {
  ds_agg: DataSource,
  ds_um2: DataSource,
  config: ConfigService,
  activities: ActivitiesService,
  sources: SourcesService,
  request: any,
  activity: any,
};

export const syncToPAWS = async (params: Params) => {
  const allowedUsersFilePath = `${params.config.get('STORAGE_PATH')}/paws-sync--allowed-users.txt`;
  const allowedUsers = await readFile(allowedUsersFilePath, 'utf8');
  if (allowedUsers.split('\n').map(user => user.trim()).includes(params.request.user.email)) {
    console.info(`[${params.request.user.email}] sync activity (${params.activity.name}) with PAWS aggregate/um2.`);
    await syncToAggUM2(params);
  } else {
    console.warn(`[${params.request.user.email}] not allowed to sync activity (${params.activity.name}) with PAWS aggregate/um2.`);
  }
};

// remove single quote, double quote, and comma
const cleanName = (name: string) => name.replace(/['",]/g, '');

const syncToAggUM2 = async (params: Params) => {
  await transaction<void>([params.ds_agg, params.ds_um2], async (agg_qr, um2_qr) => {
    const activity = params.activity;
    const activityName = cleanName(`${activity.name}__${activity.id}`);

    const user = params.request.user.email;
    activity.linkings = (await params.activities.read({ user, id: activity.id })).linkings || { um2: {}, agg: {} };

    const url = `${params.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`;
    const ids = { um2: new Set<number>(), agg: new Set<number>() };

    // insert/update activity in um2
    const um2ParentActivityInsert = await um2_qr.query(
      `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE URI = ?, Activity = ?, active = ?`, [
      activity.linkings.um2['activity-id'], 45, url, activityName, 'PCEX Set', activity.published ? 1 : 0,
      // update if exists >>>
      url, activityName, activity.published ? 1 : 0,
    ]);
    if (um2ParentActivityInsert.insertId) activity.linkings.um2['activity-id'] = um2ParentActivityInsert.insertId;
    ids.um2.add(activity.linkings.um2['activity-id']);

    for (let index = 0; index < activity.items.length; index++) {
      const source = useId(await params.sources.read({ user, id: activity.items[index].item }));
      const contentName = cleanName(`${source.name}__${activity.id}-${source.id}-${index}`);
      const isTypeExample = activity.items[index].type == 'example';

      // 1. insert/update the ent_activity (um2)
      const um2ActivityInsert = await um2_qr.query(
        `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Activity = ?, active = ?`, [
        activity.linkings.um2[`activity__${source.id}`],
        isTypeExample ? 46 : 47, '', contentName,
        isTypeExample ? 'PCEX Example' : 'PCEX Challenge', activity.published ? 1 : 0,
        // update if exists >>>
        contentName, activity.published ? 1 : 0,
      ]);
      if (um2ActivityInsert.insertId) activity.linkings.um2[`activity__${source.id}`] = um2ActivityInsert.insertId;
      ids.um2.add(activity.linkings.um2[`activity__${source.id}`]);

      // 2. insert/update rel_pcex_set_component (um2)
      await um2_qr.query(
        `INSERT IGNORE INTO rel_pcex_set_component (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
        activity.linkings.um2['activity-id'], activity.linkings.um2[`activity__${source.id}`], 45
      ]);

      // -----------------
      // IMPORTANT-NOTE:
      // for pcex_example, activity_name must be used as the content_name!
      // so, there can only be one example per activity (for now).
      // in um2 when calculating the progress of an activity, for pcex_example, activity_name is used.
      // -----------------

      const lang = source.language.toLowerCase();
      const domain = lang == 'python' ? 'py' : lang;

      // 3. insert/update ent_content (aggregate)
      const aggContentInsert = await agg_qr.query(
        `INSERT INTO ent_content (content_id, content_name, content_type, display_name, \`desc\`, url, domain, provider_id, creator_id, privacy, visible, author_name) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE content_name = ?, display_name = ?, url = ?, domain = ?, privacy = ?, visible = ?`, [
        activity.linkings.agg[`content__${source.id}`],
        isTypeExample ? activityName : contentName,
        isTypeExample ? 'pcex_set' : 'pcex_challenge', source.name,
        isTypeExample ? 'Program Construction Examples' : 'Program Construction Challenges', `${url}&index=${index}`, domain,
        isTypeExample ? 'pcex' : 'pcex_ch', params.request.user.email,
        activity.published ? 'public' : 'private', activity.published ? 1 : 0,
        params.request.user.fullname,
        // update if exists >>>
        isTypeExample ? activityName : contentName,
        source.name, `${url}&index=${index}`, domain,
        activity.published ? 'public' : 'private', activity.published ? 1 : 0,
      ]);
      if (aggContentInsert.insertId) activity.linkings.agg[`content__${source.id}`] = aggContentInsert.insertId;
      ids.agg.add(activity.linkings.agg[`content__${source.id}`]);

      if (isTypeExample) {
        // 4. insert/update example's lines
        for (const lineNumber of Object.keys(source.lines || {}).map(ln => parseInt(ln)).sort((a, b) => a - b)) {
          if (source.lines[`${lineNumber}`].comments.length == 0)
            continue; // if no comments, skip this line

          // 4.1. insert/update ent_activity for each line
          const um2ExLineInsert = await um2_qr.query(
            `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) 
              ON DUPLICATE KEY UPDATE Activity = ?, Description = ?, active = ?`, [
            activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`], 46, '', `${lineNumber}`, `PCEX Line - ${contentName}`, activity.published ? 1 : 0,
            // update if exists >>>
            `${lineNumber}`, `PCEX Line - ${contentName}`, activity.published ? 1 : 0,
          ]);
          if (um2ExLineInsert.insertId) activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`] = um2ExLineInsert.insertId;
          ids.um2.add(activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`]);

          // 4.2. insert/update rel_activity_activity for example's lines
          await um2_qr.query(
            `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
            activity.linkings.um2[`activity__${source.id}`], activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`], 46
          ]);
        }
      } else {
        // 5. insert/update challenge activity
        await um2_qr.query(
          `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
          211935, activity.linkings.um2[`activity__${source.id}`], 47
        ]);
      }
    }

    // remove old linkings (um2)
    for (const [key, id] of Object.entries<number>(activity.linkings.um2)) {
      if (ids.um2.has(id)) continue; // skip if still linked
      await um2_qr.query("DELETE FROM rel_pcex_set_component WHERE ParentActivityID = ? OR ChildActivityID = ?", [id, id]);
      await um2_qr.query("DELETE FROM rel_activity_activity WHERE ParentActivityID = ? OR ChildActivityID = ?", [id, id]);
      await um2_qr.query("DELETE FROM ent_activity WHERE ActivityID = ?", [id]);
      delete activity.linkings.um2[key];
    }

    // remove old linkings (agg)
    for (const [key, id] of Object.entries<number>(activity.linkings.agg)) {
      if (ids.agg.has(id)) continue; // skip if still linked
      await agg_qr.query("DELETE FROM ent_content WHERE content_id = ?", [id]);
      delete activity.linkings.agg[key];
    }
  }, async () => { });
};

// const old_syncToAgg = async (params: Params) => {
//   const activity = params.activity;
//   const user = params.request.user.email;
//   params.ds_agg.transaction(async (manager) => {
//     const MAPPING_ID = `[AUTO-GENERATED:DONT-CHANGE-THIS:PCEX_AUTHORING_MAPPED_ID=${activity.id}]`;

//     const [prevMapping] = await manager.query(
//       'SELECT content_id FROM ent_content WHERE provider_id = ? AND comment = ?',
//       ['pcex_activity', MAPPING_ID]
//     );

//     if (prevMapping)
//       await manager.query("DELETE FROM ent_content WHERE content_id = ?", [prevMapping.content_id]);

//     let language = (activity.items?.length
//       ? (await params.sources.read({ user, id: activity.items[0].item })).language
//       : 'undefined').toLowerCase();
//     if (language == 'python') language = 'py';

//     if (activity.published) manager.query(
//       "INSERT INTO ent_content (content_id, content_name, content_type, display_name, `desc`," +
//       " url, `domain`, provider_id, comment, visible, creation_date, creator_id, privacy, author_name) " +
//       "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
//       prevMapping?.content_id, `${activity.name}_${Date.now()}`, 'pcex_activity', activity.name, activity.description,
//       `${params.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`,
//       language, 'pcex_activity', MAPPING_ID, 1, new Date(), params.request.user.email, 'public',
//       params.request.user.fullname
//     ])
//   });
// }
