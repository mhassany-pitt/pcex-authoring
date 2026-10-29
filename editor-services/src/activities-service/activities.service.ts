import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity } from './activity.schema';
import { escapeRegex, toObject } from 'src/utils';

@Injectable()
export class ActivitiesService {

  constructor(
    private config: ConfigService,
    @InjectModel('activities') private activities: Model<Activity>
  ) { }

  db() {
    return this.activities;
  }

  async backup() {
    return (await this.activities.find()).map(toObject);
  }

  async list({ isadmin, user, archived }) {
    const filter: any = isadmin ? {} : { $or: [{ user }, { collaborator_emails: user }] };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.activities.find(filter)).map(toObject);
  }

  async listPaginated(params: {
    isadmin?: boolean;
    user: string;
    archived?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
    q?: string;
    owner?: string;
    authors?: string[];
    types?: string[];
    codeLangs?: string[];
    langs?: string[];
    statuses?: string[];
    trans?: boolean;
    counts?: string[];
    tags?: string[];
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const baseFilter: any = params.isadmin
      ? {}
      : { $or: [{ user: params.user }, { collaborator_emails: params.user }] };
    if (!params.archived) baseFilter['archived'] = { $ne: true };

    const [
      rawAuthors,
      bundleLangs,
      itemLangs,
      bundleIso,
      itemIso,
      bundleTags,
      itemTags,
      totalCount,
      mineCount,
      publishedCount,
      pawsCount,
      [countsResult]
    ] = await Promise.all([
      this.activities.distinct('user', baseFilter),
      this.activities.distinct('language', baseFilter),
      this.activities.distinct('items.details.language', baseFilter),
      this.activities.distinct('iso_language_code', baseFilter),
      this.activities.distinct('items.details.iso_language_code', baseFilter),
      this.activities.distinct('tags', baseFilter),
      this.activities.distinct('items.details.tags', baseFilter),
      this.activities.countDocuments(baseFilter),
      this.activities.countDocuments({ ...baseFilter, user: params.user }),
      this.activities.countDocuments({ ...baseFilter, published: true }),
      this.activities.countDocuments({
        $and: [
          baseFilter,
          {
            $or: [
              { linkings: true },
              { linkings: { $type: 'object', $ne: {} } }
            ]
          }
        ]
      }),
      this.activities.aggregate([
        { $match: baseFilter },
        {
          $facet: {
            authors: [{ $sortByCount: '$user' }],
            roles: [
              { $unwind: '$items' },
              { $sortByCount: '$items.type' }
            ],
            bundleLangs: [{ $sortByCount: '$language' }],
            itemLangs: [
              { $unwind: '$items' },
              { $sortByCount: '$items.details.language' }
            ],
            bundleIso: [{ $sortByCount: '$iso_language_code' }],
            itemIso: [
              { $unwind: '$items' },
              { $sortByCount: '$items.details.iso_language_code' }
            ],
            tags: [
              { $unwind: '$items' },
              { $unwind: '$items.details.tags' },
              { $project: { tag: { $arrayElemAt: [{ $split: ['$items.details.tags', ';'] }, 0] } } },
              { $sortByCount: '$tag' }
            ],
            mine: [
              { $match: { user: params.user } },
              { $count: 'count' }
            ],
            shared: [
              { $match: { user: { $ne: params.user }, collaborator_emails: params.user } },
              { $count: 'count' }
            ],
            trans: [
              {
                $match: {
                  $or: [
                    { translations: true },
                    { translations: { $type: 'object', $ne: {} } },
                    { 'items.details.translations': { $type: 'object', $ne: {} } }
                  ]
                }
              },
              { $count: 'count' }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ]),
    ]);

    const authors = (rawAuthors as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const codeLangs = Array.from(new Set([...bundleLangs, ...itemLangs] as string[])).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const langs = Array.from(new Set([...bundleIso, ...itemIso] as string[])).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const tagsSet = new Set<string>();
    for (const t of ([...bundleTags, ...itemTags] as string[])) {
      if (typeof t === 'string') {
        const clean = t.split(';')[0]?.trim();
        if (clean) tagsSet.add(clean);
      }
    }
    const tags = Array.from(tagsSet).sort((a, b) => a.localeCompare(b));

    const codeLangCountMap = new Map<string, number>();
    (countsResult?.bundleLangs || []).forEach((c: any) => {
      if (c._id) codeLangCountMap.set(c._id, (codeLangCountMap.get(c._id) || 0) + c.count);
    });
    (countsResult?.itemLangs || []).forEach((c: any) => {
      if (c._id) codeLangCountMap.set(c._id, (codeLangCountMap.get(c._id) || 0) + c.count);
    });
    const codeLangCounts = Array.from(codeLangCountMap.entries()).map(([label, value]) => ({ label, value }));

    const isoCountMap = new Map<string, number>();
    (countsResult?.bundleIso || []).forEach((c: any) => {
      if (c._id) isoCountMap.set(c._id, (isoCountMap.get(c._id) || 0) + c.count);
    });
    (countsResult?.itemIso || []).forEach((c: any) => {
      if (c._id) isoCountMap.set(c._id, (isoCountMap.get(c._id) || 0) + c.count);
    });
    const isoCounts = Array.from(isoCountMap.entries()).map(([label, value]) => ({ label, value }));

    const filterOptions = {
      authors,
      codeLangs,
      langs,
      tags,
      counts: {
        authors: (countsResult?.authors || []).map((a: any) => ({ label: a._id, value: a.count })),
        codeLangs: codeLangCounts,
        langs: isoCounts,
        tags: (countsResult?.tags || []).map((t: any) => ({ label: t._id, value: t.count })),
        roles: (countsResult?.roles || []).map((r: any) => ({ label: r._id, value: r.count })),
        mine: countsResult?.mine?.[0]?.count || mineCount,
        shared: countsResult?.shared?.[0]?.count || 0,
        trans: countsResult?.trans?.[0]?.count || 0,
        total: totalCount,
      }
    };
    const counts = {
      total: totalCount,
      mine: mineCount,
      published: publishedCount,
      paws: pawsCount,
    };

    const matchConditions: any = { ...baseFilter };

    if (params.owner === 'mine') {
      matchConditions.user = params.user;
    } else if (params.owner === 'shared') {
      matchConditions.user = { $ne: params.user };
      matchConditions.collaborator_emails = params.user;
    }

    if (params.authors?.length) {
      matchConditions.user = { $in: params.authors };
    }

    if (params.types?.length) {
      matchConditions['items.type'] = { $in: params.types };
    }

    const andConditions: any[] = [];

    if (params.codeLangs?.length) {
      const codeLangsRegex = params.codeLangs.map(l => new RegExp(`^${escapeRegex(l)}$`, 'i'));
      andConditions.push({
        $or: [
          { language: { $in: codeLangsRegex } },
          { 'items.details.language': { $in: codeLangsRegex } }
        ]
      });
    }

    if (params.langs?.length) {
      andConditions.push({
        $or: [
          { iso_language_code: { $in: params.langs } },
          { 'items.details.iso_language_code': { $in: params.langs } }
        ]
      });
    }

    if (params.statuses?.length) {
      const statusOrs: any[] = [];
      if (params.statuses.includes('published')) {
        statusOrs.push({ published: true });
      }
      if (params.statuses.includes('paws')) {
        statusOrs.push({ linkings: true });
        statusOrs.push({ linkings: { $type: 'object', $ne: {} } });
      }
      if (params.statuses.includes('draft')) {
        statusOrs.push({ published: { $ne: true } });
      }
      if (statusOrs.length > 0) {
        andConditions.push({ $or: statusOrs });
      }
    }

    if (params.trans) {
      andConditions.push({
        $or: [
          { translations: true },
          { translations: { $type: 'object', $ne: {} } },
          { 'items.details.translations': { $type: 'object', $ne: {} } }
        ]
      });
    }

    if (params.tags?.length) {
      const tagRegexes = params.tags.map(t => new RegExp(`^${escapeRegex(t)}($|;)`, 'i'));
      andConditions.push({
        $or: [
          { tags: { $in: tagRegexes } },
          { 'items.details.tags': { $in: tagRegexes } }
        ]
      });
    }

    if (params.q?.trim()) {
      const q = params.q.trim();
      const qRegex = new RegExp(escapeRegex(q), 'i');
      const orClauses: any[] = [
        { name: qRegex },
        { description: qRegex },
        { untr_name: qRegex },
        { untr_description: qRegex },
        { user: qRegex },
        { language: qRegex },
        { iso_language_code: qRegex },
        { collaborator_emails: qRegex },
        { tags: qRegex },
        { 'items.item': qRegex },
        { 'items.details.name': qRegex },
        { 'items.details.description': qRegex },
        { 'items.details.untr_name': qRegex },
        { 'items.details.untr_description': qRegex },
        { 'items.details.language': qRegex },
        { 'items.details.iso_language_code': qRegex },
        { 'items.details.tags': qRegex },
        { _id: q },
      ];
      if (q.length === 24 && /^[0-9a-fA-F]{24}$/.test(q)) {
        orClauses.push({ _id: new Types.ObjectId(q) });
      }
      andConditions.push({ $or: orClauses });
    }

    if (andConditions.length > 0) {
      matchConditions.$and = andConditions;
    }

    let countsMatch: any = null;
    if (params.counts?.length) {
      const countOrs: any[] = [];
      if (params.counts.includes('1')) {
        countOrs.push({ items_count: 1 });
      }
      if (params.counts.includes('2-4')) {
        countOrs.push({ items_count: { $gte: 2, $lte: 4 } });
      }
      if (params.counts.includes('5+')) {
        countOrs.push({ items_count: { $gte: 5 } });
      }
      if (countOrs.length > 0) {
        countsMatch = { $or: countOrs };
      }
    }

    let sortStage: any = { effective_created_at: -1, _id: -1 };
    switch (params.sort) {
      case 'date_asc':
        sortStage = { effective_created_at: 1, _id: 1 };
        break;
      case 'updated_desc':
        sortStage = { effective_updated_at: -1, _id: -1 };
        break;
      case 'updated_asc':
        sortStage = { effective_updated_at: 1, _id: 1 };
        break;
      case 'name_asc':
        sortStage = { name: 1, _id: -1 };
        break;
      case 'name_desc':
        sortStage = { name: -1, _id: -1 };
        break;
      case 'items_desc':
        sortStage = { items_count: -1, _id: -1 };
        break;
      case 'items_asc':
        sortStage = { items_count: 1, _id: -1 };
        break;
      case 'date_desc':
      default:
        sortStage = { effective_created_at: -1, _id: -1 };
        break;
    }

    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $addFields: {
          effective_created_at: {
            $ifNull: [
              '$created_at',
              {
                $ifNull: [
                  {
                    $convert: {
                      input: '$_id',
                      to: 'date',
                      onError: null,
                      onNull: null,
                    },
                  },
                  { $ifNull: ['$updated_at', new Date(0)] },
                ],
              },
            ],
          },
          effective_updated_at: {
            $ifNull: [
              '$updated_at',
              {
                $ifNull: [
                  '$created_at',
                  {
                    $convert: {
                      input: '$_id',
                      to: 'date',
                      onError: null,
                      onNull: null,
                    },
                  },
                ],
              },
            ],
          },
          items_count: {
            $cond: {
              if: { $isArray: '$items' },
              then: { $size: '$items' },
              else: 0
            }
          }
        }
      }
    ];

    if (countsMatch) {
      pipeline.push({ $match: countsMatch });
    }

    pipeline.push({
      $facet: {
        total: [{ $count: 'count' }],
        items: [
          { $sort: sortStage },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              untr_name: 1,
              untr_description: 1,
              items: 1,
              linkings: 1,
              user: 1,
              iso_language_code: 1,
              translations: 1,
              collaborator_emails: 1,
              created_at: { $ifNull: ['$created_at', '$effective_created_at'] },
              updated_at: { $ifNull: ['$updated_at', '$effective_updated_at'] },
              published: 1,
              archived: 1,
              items_count: 1,
            }
          }
        ]
      }
    });

    const [aggResult] = await this.activities.aggregate(pipeline).collation({ locale: 'en', strength: 2 });
    const total = aggResult?.total?.[0]?.count || 0;
    const items = aggResult?.items || [];

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      filterOptions,
      counts
    };
  }

  async create(model: any) {
    return await this.activities.create(model);
  }

  async read({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }) {
    if (isadmin) {
      return toObject(await this.activities.findOne({ _id }));
    }
    const doc = await this.activities.findOne({ $or: [{ user }, { collaborator_emails: user }], _id });
    if (doc) return toObject(doc);

    // Allow read access if this bundle is linked as a translation variation to a bundle the user has access to
    const target = await this.activities.findOne({ _id });
    if (target) {
      const translationIds = Object.values(target.translations || {}).filter(Boolean);
      const hasAccess = await this.activities.exists({
        $and: [
          { $or: [{ user }, { collaborator_emails: user }] },
          {
            $or: [
              ...(translationIds.length > 0 ? [{ _id: { $in: translationIds } }] : []),
              {
                $expr: {
                  $in: [
                    _id,
                    {
                      $map: {
                        input: {
                          $objectToArray: {
                            $cond: [
                              { $eq: [{ $type: '$translations' }, 'object'] },
                              '$translations',
                              {}
                            ]
                          }
                        },
                        as: 't',
                        in: { $toString: '$$t.v' }
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      });
      if (hasAccess) {
        return toObject(target);
      }
    }
    return null;
  }

  async update({ isadmin, user, id: _id, ...model }: { isadmin?: boolean, user: string, id: string, [key: string]: any }) {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.activities.updateOne(filter, model);
  }

  async remove({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }): Promise<any> {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.activities.deleteOne(filter);
  }
}
