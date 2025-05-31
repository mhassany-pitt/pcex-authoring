import { ConfigService } from "@nestjs/config";
import { ActivitiesService } from "src/activities-service/activities.service";
import { SourcesService } from "src/sources-service/sources.service";
import { transaction } from "src/utils";
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
  const isme = ['moh70@pitt.edu', 'arl122@pitt.edu'].includes(params.request.user.email);
  if (isme) await syncToAggUM2(params);
  else /**/ await old_syncToAgg(params);
};

const syncToAggUM2 = async (params: Params) => {
  await transaction<void>([params.ds_agg, params.ds_um2], async (agg_qr, um2_qr) => {
    const activity = params.activity;
    const user = params.request.user.email;

    activity.linkings = (await params.activities.read({ user, id: activity.id })).linkings || { um2: {}, agg: {} };

    const url = `${params.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`;
    const ids = { um2: new Set<number>(), agg: new Set<number>() };

    // insert/update activity in um2
    const um2ParentActivityInsert = await um2_qr.query(
      `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE URI = ?, Activity = ?, active = ?`, [
      activity.linkings.um2['activity-id'], 45, url, `${activity.name}__${activity.id}`, 'PCEX Set', activity.published ? 1 : 0,
      // update if exists >>>
      url, `${activity.name}__${activity.id}`, activity.published ? 1 : 0,
    ]);
    if (um2ParentActivityInsert.insertId) activity.linkings.um2['activity-id'] = um2ParentActivityInsert.insertId;
    ids.um2.add(activity.linkings.um2['activity-id']);

    for (const goal of activity.items) {
      goal.id = goal.item;
      // act and sub should have same appid
      // line-click action ==> act=example-name&sub=line-number&app=46
      // challenge action ==>  act=PCEX_CHALLENGE&sub=challenge-name&appid=47

      // 1. insert/update the ent_activity (um2)
      const um2ActivityInsert = await um2_qr.query(
        `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Activity = ?, active = ?`, [
        activity.linkings.um2[`activity__${goal.id}`],
        goal.type == 'example' ? 46 : 47, '', `${goal.details.name}__${goal.id}`,
        goal.type == 'example' ? 'PCEX Example' : 'PCEX Challenge', activity.published ? 1 : 0,
        // update if exists >>>
        `${goal.details.name}__${goal.id}`, activity.published ? 1 : 0,
      ]);
      if (um2ActivityInsert.insertId) activity.linkings.um2[`activity__${goal.id}`] = um2ActivityInsert.insertId;
      ids.um2.add(activity.linkings.um2[`activity__${goal.id}`]);

      // 2. insert/update rel_pcex_set_component (um2)
      await um2_qr.query(
        `INSERT IGNORE INTO rel_pcex_set_component (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
        activity.linkings.um2['activity-id'], activity.linkings.um2[`activity__${goal.id}`], 45
      ]);

      const source = await params.sources.read({ user, id: goal.id });
      const lang = source.language.toLowerCase();
      const domain = lang == 'python' ? 'py' : lang;

      // 3. insert/update ent_content (aggregate)
      const aggContentInsert = await agg_qr.query(
        `INSERT INTO ent_content (content_id, content_name, content_type, display_name, \`desc\`, url, domain, provider_id, creator_id, privacy, visible, author_name) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE content_name = ?, display_name = ?, url = ?, domain = ?, privacy = ?, visible = ?`, [
        activity.linkings.agg[`content__${goal.id}`], `${goal.details.name}__${goal.id}`,
        goal.type == 'example' ? 'pcex_set' : 'pcex_challenge', goal.details.name,
        goal.type == 'example' ? 'Program Construction Examples' : 'Program Construction Challenges', url, domain,
        goal.type == 'example' ? 'pcex' : 'pcex_ch', params.request.user.email,
        activity.published ? 'public' : 'private', activity.published ? 1 : 0,
        params.request.user.fullname,
        // update if exists >>>
        `${goal.details.name}__${goal.id}`, goal.details.name, url, domain,
        activity.published ? 'public' : 'private', activity.published ? 1 : 0,
      ]);
      if (aggContentInsert.insertId) activity.linkings.agg[`content__${goal.id}`] = aggContentInsert.insertId;
      ids.agg.add(activity.linkings.agg[`content__${goal.id}`]);

      if (goal.type == 'example') {
        // 4. insert/update example's lines
        for (const lineNumber of Object.keys(source.lines).map(ln => parseInt(ln)).sort((a, b) => a - b)) {
          if (source.lines[`${lineNumber}`].comments.length == 0)
            continue; // if no comments, skip this line

          // 4.1. insert/update ent_activity for each line
          const um2ExLineInsert = await um2_qr.query(
            `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) 
              ON DUPLICATE KEY UPDATE Activity = ?, Description = ?, active = ?`, [
            activity.linkings.um2[`activity-ln${lineNumber}__${goal.id}`], 46, '', `${lineNumber}`, `PCEX Line - ${goal.details.name}__${goal.id}`, activity.published ? 1 : 0,
            // update if exists >>>
            `${lineNumber}`, `PCEX Line - ${goal.details.name}__${goal.id}`, activity.published ? 1 : 0,
          ]);
          if (um2ExLineInsert.insertId) activity.linkings.um2[`activity-ln${lineNumber}__${goal.id}`] = um2ExLineInsert.insertId;
          ids.um2.add(activity.linkings.um2[`activity-ln${lineNumber}__${goal.id}`]);

          // 4.2. insert/update rel_activity_activity for example's lines
          await um2_qr.query(
            `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
            activity.linkings.um2[`activity__${goal.id}`], activity.linkings.um2[`activity-ln${lineNumber}__${goal.id}`], 46
          ]);
        }
      } else {
        // 5. insert/update challenge activity
        await um2_qr.query(
          `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`, [
          211935, activity.linkings.um2[`activity__${goal.id}`], 47
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

const old_syncToAgg = async (params: Params) => {
  const activity = params.activity;
  const user = params.request.user.email;
  params.ds_agg.transaction(async (manager) => {
    const MAPPING_ID = `[AUTO-GENERATED:DONT-CHANGE-THIS:PCEX_AUTHORING_MAPPED_ID=${activity.id}]`;

    const [prevMapping] = await manager.query(
      'SELECT content_id FROM ent_content WHERE provider_id = ? AND comment = ?',
      ['pcex_activity', MAPPING_ID]
    );

    if (prevMapping)
      await manager.query("DELETE FROM ent_content WHERE content_id = ?", [prevMapping.content_id]);

    let language = (activity.items?.length
      ? (await params.sources.read({ user, id: activity.items[0].item })).language
      : 'undefined').toLowerCase();
    if (language == 'python') language = 'py';

    if (activity.published) manager.query(
      "INSERT INTO ent_content (content_id, content_name, content_type, display_name, `desc`," +
      " url, `domain`, provider_id, comment, visible, creation_date, creator_id, privacy, author_name) " +
      "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      prevMapping?.content_id, `${activity.name}_${Date.now()}`, 'pcex_activity', activity.name, activity.description,
      `${params.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`,
      language, 'pcex_activity', MAPPING_ID, 1, new Date(), params.request.user.email, 'public',
      params.request.user.fullname
    ])
  });
}
