import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { ActivitiesService } from 'src/activities-service/activities.service';
import { SourcesService } from 'src/sources-service/sources.service';
import { UsersService } from 'src/users/users.service';
import { transaction, useId } from 'src/utils';
import { DataSource, QueryRunner } from 'typeorm';
import { slugify } from 'transliteration';

type Params = {
  ds_agg: DataSource;
  ds_um2: DataSource;
  config: ConfigService;
  activities: ActivitiesService;
  sources: SourcesService;
  users: UsersService;
  request: any;
  activity: any;
  isadmin: boolean;
};

const createSyncError = (message: string, error?: any, details?: string) => {
  const wrappedDetails = error?.isAxiosError ? null : details;
  const wrapped: any = new Error([message, wrappedDetails].filter(Boolean).join('\n\n'));

  wrapped.name = error?.name || 'Error';
  wrapped.code = error?.code;
  wrapped.errno = error?.errno;
  wrapped.isAxiosError = error?.isAxiosError;
  wrapped.config = error?.config;
  wrapped.response = error?.response;
  wrapped.request = error?.request;
  wrapped.cause = error;
  wrapped.stack = error?.stack || wrapped.stack;

  return wrapped;
};

export const syncToPAWS = async (params: Params) => {
  const activityLabel = `"${params.activity?.name || params.activity?.id || 'unknown'}" (${params.activity?.id || 'unknown'})`;

  try {
    const allowedUsersFilePath = `${params.config.get('STORAGE_PATH')}/paws-sync--allowed-users.txt`;
    const allowedUsers = await readFile(allowedUsersFilePath, 'utf8');
    const email = params.request.user?.email?.toLowerCase();
    if (
      allowedUsers
        .toLowerCase()
        .split('\n')
        .map((user) => user.trim())
        .includes(email)
    ) {
      console.info(
        `[${email}] sync activity (${params.activity.name}) with PAWS aggregate/um2.`,
      );
      await syncToAggUM2(params); // IMPORTANT: /aggregateUMServices and /cbum needs restart to reflect the changes
      console.info(
        `[${email}] sync activity (${params.activity.name}) with PAWS catalog v2.`,
      );
      await syncToCatalog(params);
    } else {
      console.warn(
        `[${email}] not allowed to sync activity (${params.activity.name}) with PAWS Catalog.`,
      );
    }
  } catch (error: any) {
    throw createSyncError(
      `Failed to sync activity ${activityLabel} to PAWS.`,
      error,
      error?.message || error?.stack || `${error}`,
    );
  }
};

// remove single quote, double quote, and comma
const cleanName = (name: string) => name.replace(/['",]/g, '');

const exec_query = async (ds: QueryRunner, query: string, params: any[]) => {
  console.log(
    `[PAWS-SYNC-QUERY] ${query}\n\t --> [${JSON.stringify(params || {})}]`,
  );
  return await ds.query(query, params);
};

const prepURL = (activity: any, protocol: string) => {
  const name = slugify(activity.name, { separator: '_' });
  return `https://acos.cs.vt.edu/${protocol}/acos-pcex/acos-pcex-examples/${name.replace(/ /g, '_').replace(/\./g, '_')}__${activity.id}`;
};

const syncToAggUM2 = async (params: Params) => {
  await transaction<void>(
    [params.ds_agg, params.ds_um2],
    async (agg_qr, um2_qr) => {
      const activity = params.activity;
      const activityName = cleanName(`${activity.name}__${activity.id}`);

      activity.linkings = (
        await params.activities.read({ 
          isadmin: params.isadmin,
          user: params.request.user.email,
          id: activity.id 
        })
      ).linkings || { um2: {}, agg: {} };
      if (!activity.linkings.um2) activity.linkings.um2 = {};
      if (!activity.linkings.agg) activity.linkings.agg = {};

      // const url = `${params.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`;
      const url = prepURL(activity, 'html');
      console.log('--------------------------------');
      console.log('Prepared URL for PAWS:', url);
      console.log('--------------------------------');
      const ids = { um2: new Set<number>(), agg: new Set<number>() };

      // insert/update activity in um2
      const um2ParentActivityInsert = await exec_query(
        um2_qr,
        `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE URI = ?, Activity = ?, active = ?`,
        [
          activity.linkings.um2['activity-id'],
          45,
          url,
          activityName,
          'PCEX Set',
          activity.published ? 1 : 0,
          // update if exists >>>
          url,
          activityName,
          activity.published ? 1 : 0,
        ],
      );
      if (um2ParentActivityInsert.insertId)
        activity.linkings.um2['activity-id'] = um2ParentActivityInsert.insertId;
      ids.um2.add(activity.linkings.um2['activity-id']);

      for (let index = 0; index < activity.items.length; index++) {
        const source = useId(
          await params.sources.read({ 
            isadmin: params.isadmin,
            user: params.request.user.email,
            id: activity.items[index].item 
          }),
        );
        if (!source) {
          throw createSyncError(
            `Missing source while syncing activity "${activity.name}" (${activity.id}).`,
            undefined,
            `Item index: ${index}\nSource id: ${activity.items[index].item}\nType: ${activity.items[index].type}`,
          );
        }
        const contentName = cleanName(
          `${source.name}__${activity.id}-${source.id}-${index}`,
        );
        const isTypeExample = activity.items[index].type == 'example';

        // 1. insert/update the ent_activity (um2)
        const um2ActivityInsert = await exec_query(
          um2_qr,
          `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE Activity = ?, active = ?`,
          [
            activity.linkings.um2[`activity__${source.id}`],
            isTypeExample ? 46 : 47,
            '',
            contentName,
            isTypeExample ? 'PCEX Example' : 'PCEX Challenge',
            activity.published ? 1 : 0,
            // update if exists >>>
            contentName,
            activity.published ? 1 : 0,
          ],
        );
        if (um2ActivityInsert.insertId)
          activity.linkings.um2[`activity__${source.id}`] =
            um2ActivityInsert.insertId;
        ids.um2.add(activity.linkings.um2[`activity__${source.id}`]);

        // 2. insert/update rel_pcex_set_component (um2)
        await exec_query(
          um2_qr,
          `INSERT IGNORE INTO rel_pcex_set_component (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`,
          [
            activity.linkings.um2['activity-id'],
            activity.linkings.um2[`activity__${source.id}`],
            45,
          ],
        );

        // -----------------
        // IMPORTANT-NOTE:
        // for pcex_example, activity_name must be used as the content_name!
        // so, there can only be one example per activity (for now).
        // in um2 when calculating the progress of an activity, for pcex_example, activity_name is used.
        // -----------------

        const lang = source.language.toLowerCase();
        const domain = lang == 'python' ? 'py' : lang;

        // 3. insert/update ent_content (aggregate)
        const aggContentInsert = await exec_query(
          agg_qr,
          `INSERT INTO ent_content (content_id, content_name, content_type, display_name, \`desc\`, url, domain, provider_id, creator_id, privacy, visible, author_name) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE content_name = ?, display_name = ?, url = ?, domain = ?, privacy = ?, visible = ?`,
          [
            activity.linkings.agg[`content__${source.id}`],
            isTypeExample ? activityName : contentName,
            isTypeExample ? 'pcex_set' : 'pcex_challenge',
            source.name,
            isTypeExample
              ? 'Program Construction Examples'
              : 'Program Construction Challenges',
            `${url}&index=${index}`,
            domain,
            isTypeExample ? 'pcex' : 'pcex_ch',
            params.request.user.email,
            activity.published ? 'public' : 'private',
            activity.published ? 1 : 0,
            params.request.user.fullname,
            // update if exists >>>
            isTypeExample ? activityName : contentName,
            source.name,
            `${url}&index=${index}`,
            domain,
            activity.published ? 'public' : 'private',
            activity.published ? 1 : 0,
          ],
        );
        if (aggContentInsert.insertId)
          activity.linkings.agg[`content__${source.id}`] =
            aggContentInsert.insertId;
        ids.agg.add(activity.linkings.agg[`content__${source.id}`]);

        // title, problem-statement, code, solution, iframe-url
        await exec_query(
          agg_qr,
          'DELETE FROM ent_content_attrs WHERE content_id = ?',
          [activity.linkings.agg[`content__${source.id}`]],
        );
        await exec_query(
          agg_qr,
          `INSERT INTO ent_content_attrs (content_id, description, code, preview_url, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            activity.linkings.agg[`content__${source.id}`],
            source.description,
            source.code,
            `${url}&index=${index}`,
            isTypeExample
              ? ''
              : JSON.stringify({
                  distractors: source.distractors?.map(
                    ({ code, description, line_number }: any) => ({
                      content: code,
                      commentList: [description],
                      line_number,
                    }),
                  ),
                }),
          ],
        );

        if (isTypeExample) {
          // 4. insert/update example's lines
          for (const lineNumber of Object.keys(source.lines || {})
            .map((ln) => parseInt(ln))
            .sort((a, b) => a - b)) {
            if (source.lines[`${lineNumber}`].comments.length == 0) continue; // if no comments, skip this line

            // 4.1. insert/update ent_activity for each line
            const um2ExLineInsert = await exec_query(
              um2_qr,
              `INSERT INTO ent_activity (ActivityID, AppID, URI, Activity, Description, active) VALUES (?, ?, ?, ?, ?, ?) 
              ON DUPLICATE KEY UPDATE Activity = ?, Description = ?, active = ?`,
              [
                activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`],
                46,
                '',
                `${lineNumber}`,
                `PCEX Line - ${contentName}`,
                activity.published ? 1 : 0,
                // update if exists >>>
                `${lineNumber}`,
                `PCEX Line - ${contentName}`,
                activity.published ? 1 : 0,
              ],
            );
            if (um2ExLineInsert.insertId)
              activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`] =
                um2ExLineInsert.insertId;
            ids.um2.add(
              activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`],
            );

            // 4.2. insert/update rel_activity_activity for example's lines
            await exec_query(
              um2_qr,
              `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`,
              [
                activity.linkings.um2[`activity__${source.id}`],
                activity.linkings.um2[`activity-ln${lineNumber}__${source.id}`],
                46,
              ],
            );
          }
        } else {
          // 5. insert/update challenge activity
          await exec_query(
            um2_qr,
            `INSERT IGNORE INTO rel_activity_activity (ParentActivityID, ChildActivityID, AppID) VALUES (?, ?, ?)`,
            [211935, activity.linkings.um2[`activity__${source.id}`], 47],
          );
        }
      }

      // remove old linkings (um2)
      for (const [key, id] of Object.entries<number>(activity.linkings.um2)) {
        if (ids.um2.has(id)) continue; // skip if still linked
        await exec_query(
          um2_qr,
          'DELETE FROM rel_pcex_set_component WHERE ParentActivityID = ? OR ChildActivityID = ?',
          [id, id],
        );
        await exec_query(
          um2_qr,
          'DELETE FROM rel_activity_activity WHERE ParentActivityID = ? OR ChildActivityID = ?',
          [id, id],
        );
        await exec_query(
          um2_qr,
          'DELETE FROM ent_activity WHERE ActivityID = ?',
          [id],
        );
        delete activity.linkings.um2[key];
      }

      // remove old linkings (agg)
      for (const [key, id] of Object.entries<number>(activity.linkings.agg)) {
        if (ids.agg.has(id)) continue; // skip if still linked
        await exec_query(
          agg_qr,
          'DELETE FROM ent_content WHERE content_id = ?',
          [id],
        );
        delete activity.linkings.agg[key];
      }
    },
    async () => {},
  );
};

const syncToCatalog = async ({ activity, users, sources, config, isadmin }: Params) => {
  activity.linkings.catalog ||= {};
  const curLinkingIds = new Set<string>();

  // post/patch activity to catalog
  const source0 = useId(await sources.read({ isadmin, user: activity.user, id: activity.items[0]?.item }));
  if (`activity-id` in activity.linkings.catalog) {
    const id = activity.linkings.catalog[`activity-id`];
    console.log(`Activity (${activity.name}) already linked to catalog (id=${id}), patching the item...`);
    await patchToCatalog(id, await activityToCatalogItem(activity, source0, users), config);
    curLinkingIds.add(id);
  } else {
    console.log(`Activity (${activity.name}) not linked to catalog, posting the item...`);
    const { id } = await postToCatalog(await activityToCatalogItem(activity, source0, users), config);
    activity.linkings.catalog[`activity-id`] = id;
    curLinkingIds.add(id);
    console.log(`Activity (${activity.name}) linked to catalog with id=${id}`);
  }

  // post/patch sources to catalog
  for (let index = 0; index < activity.items.length; index++) {
    const type = activity.items[index].type;
    const source = useId(await sources.read({ isadmin, user: activity.user, id: activity.items[index].item }));
    if (`source__${activity.items[index].item}` in activity.linkings.catalog) {
      const id = activity.linkings.catalog[`source__${activity.items[index].item}`];
      console.log(`Source (${source.name}) already linked to catalog (id=${id}), patching the item...`);
      await patchToCatalog(id, await sourceToCatalogItem(source, activity, index, type, users), config);
      curLinkingIds.add(id);
    } else {
      console.log(`Source (${source.name}) not linked to catalog, posting the item...`);
      const { id } = await postToCatalog(await sourceToCatalogItem(source, activity, index, type, users), config);
      activity.linkings.catalog[`source__${activity.items[index].item}`] = id;
      curLinkingIds.add(id);
      console.log(`Source (${source.name}) linked to catalog with id=${id}`);
    }
  }

  const oldLinkingIds = Object.keys(activity.linkings.catalog).filter(key => !curLinkingIds.has(activity.linkings.catalog[key]));
  for (const oldLinkingId of oldLinkingIds) {
    console.log(`Source (${activity.linkings.catalog[`${oldLinkingId}`]}) is no longer linked to the activity, deleting from catalog...`);
    await deleteFromCatalog(activity.linkings.catalog[`${oldLinkingId}`], config);
    delete activity.linkings.catalog[`${oldLinkingId}`];
  }

  console.log(`Finished syncing activity (${activity.name}) and its sources with catalog. Current catalog linkings:`, activity.linkings.catalog);
};

const postToCatalog = async (item: any, config: ConfigService) => {
  const apiToken = config.get('PAWS_CATALOG_API_TOKEN');
  console.log(`Posting item to catalog with data:`, JSON.stringify(item));
  const response = await axios.post(
    `${config.get('PAWS_CATALOG_API')}/api/slc-items-api/`,
    item,
    { headers: { 'api-token': apiToken, 'api-user-email': item.user_email } }
  );
  console.log(`Post response for item:`, response.status, response.statusText, response.data.id);
  return { id: response.data.id };
};

const patchToCatalog = async (id: string, item: any, config: ConfigService) => {
  const apiToken = config.get('PAWS_CATALOG_API_TOKEN');
  const { listed_at, ...others } = item;
  console.log(`Patching item (id=${id}) to catalog with data:`, JSON.stringify(item));
  const response = await axios.patch(
    `${config.get('PAWS_CATALOG_API')}/api/slc-items-api/${id}`,
    others,
    { headers: { 'api-token': apiToken, 'api-user-email': item.user_email } }
  );
  console.log(`Patch response for item (id=${id}):`, response.status, response.statusText, response.data.id);
  return { id: response.data.id };
};

const deleteFromCatalog = async (id: string, config: ConfigService) => { 
  const apiToken = config.get('PAWS_CATALOG_API_TOKEN');
  console.log(`Deleting item (id=${id}) from catalog...`);
  const response = await axios.delete(
    `${config.get('PAWS_CATALOG_API')}/api/slc-items-api/${id}`,
    { headers: { 'api-token': apiToken } }
  );
  console.log(`Delete response for item (id=${id}):`, response.status, response.statusText);
};

function titlecase(text: string): string {
  return text ? text.toLowerCase().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') : text;
}

const activityToCatalogItem = async (activity: any, source0: any, users: UsersService) => {
  return {
    "user_email": activity.user,
    "status": activity.published ? "public" : "private",
    "listed_at": new Date().toISOString(),
    "tags": [],
    "identity": { 
      "id": cleanName(`${slugify(activity.name, { separator: '_' })}__${activity.id}`), 
      "type": "CodeConstruction&CompletionBundle", 
      "title": activity.name 
    },
    "links": { "demo_url": prepURL(activity, 'html') },
    "attribution": {
        "created_at": activity.created_at,
        "provider": "PCEX", 
        "publisher": "",
        "authors": [{ "name": (await users.findUser(activity.user))?.fullname || "", "affiliation": "" }]
    },
    "languages": {
        "content_language": source0?.iso_language_code ? source0?.iso_language_code.toLowerCase() : 'en',
        "programming_languages": [titlecase(source0?.language) || 'unknown']
    },
    "content": { "prompt": "", "source_code": "" },
    "classification": { "topics": [], "difficulty": "" },
    "pedagogy": {
        "learning_objectives": [],
        "instructional_role": "",
        "prerequisites": {"topics": [],"concepts": [],"item_ids": []}
    },
    "interaction": { "interaction_type": "" },
    "delivery": [
        { "protocol": "PITT", "url": prepURL(activity, 'pitt') },
        { "protocol": "SPLICE", "url": prepURL(activity, 'html') }
    ],
    "rights": { "license": "MIT", "license_url": "", "usage_notes": "" },
    "uses": []
  };
};

const sourceToCatalogItem = async (source: any, activity: any, index: number, type: string, users: UsersService) => {
  return {
    "paws_id": activity.linkings.agg[`content__${source.id}`],
    "user_email": source.user,
    "status": activity.published ? "public" : "private",
    "listed_at": new Date().toISOString(),
    "tags": source.tags || [],
    "identity": {
        "id": cleanName(`${slugify(source.name, { separator: '_' })}__${activity.id}-${source.id}-${index}`),
        "type": type == 'example' ? 'CodeConstruction' : 'CodeCompletion',
        "title": source.name,
    },
    "links": { "demo_url": prepURL(activity, 'html') + `?index=${index}` },
    "attribution": {
        "created_at": source.created_at,
        "provider": "PCEX",
        "publisher": "",
        "authors": [{ "name": (await users.findUser(source.user))?.fullname || "", "affiliation": "" }]
    },
    "languages": {
        "content_language": source.iso_language_code ? source.iso_language_code.toLowerCase() : 'en',
        "programming_languages": [titlecase(source.language) || 'unknown']
    },
    "content": {
        "prompt": source.description,
        "source_code": source.code
    },
    "classification": { "topics": [], "difficulty": "" },
    "pedagogy": {
        "learning_objectives": [], "instructional_role": "",
        "prerequisites": {"topics": [],"concepts": [],"item_ids": []}
    },
    "interaction": { "interaction_type": "" },
    "delivery": [
        { "protocol": "PITT", "url": prepURL(activity, 'pitt') + `?index=${index}` },
        { "protocol": "SPLICE", "url": prepURL(activity, 'html') + `?index=${index}` }
    ],
    "rights": { "license": "MIT", "license_url": "", "usage_notes": "" },
    "uses": []
  };
};
