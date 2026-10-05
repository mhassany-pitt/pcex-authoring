import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Source } from './source.schema';
import { escapeRegex, toObject } from 'src/utils';
import { ensureDirSync, writeFile } from 'fs-extra';

@Injectable()
export class SourcesService {

  STORAGE_PATH = this.config.get('STORAGE_PATH');

  constructor(
    private config: ConfigService,
    @InjectModel('sources') private sources: Model<Source>,
  ) {
    ensureDirSync(`${this.STORAGE_PATH}/logs`);
  }

  // async samples() {
  //   return {
  //     example: this.config.get('SAMPLE_EXAMPLE_URL'),
  //     challenge: this.config.get('SAMPLE_CHALLENGE_URL'),
  //   }
  // }

  db() {
    return this.sources;
  }

  async backup() {
    return (await this.sources.find()).map(toObject);
  }

  async list({ isadmin, user, archived }: { isadmin?: boolean, user: string, archived?: boolean }) {
    const filter: any = isadmin ? {} : { $or: [{ user }, { collaborator_emails: user }] };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.sources.find(filter)).map(toObject);
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
    codeLangs?: string[];
    langs?: string[];
    roles?: string[];
    trans?: boolean;
    tags?: string[];
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const baseFilter: any = params.isadmin
      ? {}
      : { $or: [{ user: params.user }, { collaborator_emails: params.user }] };
    if (!params.archived) baseFilter['archived'] = { $ne: true };

    const [rawAuthors, rawCodeLangs, rawLangs, rawTags] = await Promise.all([
      this.sources.distinct('user', baseFilter),
      this.sources.distinct('language', baseFilter),
      this.sources.distinct('iso_language_code', baseFilter),
      this.sources.distinct('tags', baseFilter),
    ]);

    const authors = (rawAuthors as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const codeLangs = (rawCodeLangs as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const langs = (rawLangs as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const tagsSet = new Set<string>();
    for (const t of (rawTags as string[])) {
      if (typeof t === 'string') {
        const clean = t.split(';')[0]?.trim();
        if (clean) tagsSet.add(clean);
      }
    }
    const tags = Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
    const filterOptions = { authors, codeLangs, langs, tags };

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

    if (params.codeLangs?.length) {
      matchConditions.language = { $in: params.codeLangs };
    }

    if (params.langs?.length) {
      matchConditions.iso_language_code = { $in: params.langs };
    }

    if (params.trans) {
      const transCondition = {
        $or: [
          { translations: true },
          { translations: { $type: 'object', $ne: {} } }
        ]
      };
      if (matchConditions.$and) {
        matchConditions.$and.push(transCondition);
      } else {
        matchConditions.$and = [transCondition];
      }
    }

    if (params.tags?.length) {
      const tagRegexes = params.tags.map(t => new RegExp(`^${escapeRegex(t)}($|;)`, 'i'));
      matchConditions.tags = { $in: tagRegexes };
    }

    if (params.q?.trim()) {
      const q = params.q.trim();
      const qRegex = new RegExp(escapeRegex(q), 'i');
      const orClauses: any[] = [
        { name: qRegex },
        { description: qRegex },
        { language: qRegex },
        { iso_language_code: qRegex },
        { tags: qRegex },
        { user: qRegex },
        { collaborator_emails: qRegex },
      ];
      if (q.length === 24 && /^[0-9a-fA-F]{24}$/.test(q)) {
        orClauses.push({ _id: new Types.ObjectId(q) });
      }
      if (matchConditions.$and) {
        matchConditions.$and.push({ $or: orClauses });
      } else {
        matchConditions.$and = [{ $or: orClauses }];
      }
    }

    let roleMatch: any = null;
    if (params.roles?.length === 1) {
      if (params.roles[0] === 'example') {
        roleMatch = { blank_lines_count: 0 };
      } else if (params.roles[0] === 'challenge') {
        roleMatch = { blank_lines_count: { $gt: 0 } };
      }
    }

    let sortStage: any = { _id: -1 };
    switch (params.sort) {
      case 'date_asc':
        sortStage = { _id: 1 };
        break;
      case 'name_asc':
        sortStage = { name: 1, _id: -1 };
        break;
      case 'name_desc':
        sortStage = { name: -1, _id: -1 };
        break;
      case 'blanks_desc':
        sortStage = { blank_lines_count: -1, _id: -1 };
        break;
      case 'blanks_asc':
        sortStage = { blank_lines_count: 1, _id: -1 };
        break;
      case 'date_desc':
      default:
        sortStage = { _id: -1 };
        break;
    }

    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $addFields: {
          blank_lines_count: {
            $cond: {
              if: { $eq: [{ $type: '$lines' }, 'object'] },
              then: {
                $size: {
                  $filter: {
                    input: {
                      $objectToArray: {
                        $cond: [
                          { $eq: [{ $type: '$lines' }, 'object'] },
                          '$lines',
                          {}
                        ]
                      }
                    },
                    as: 'l',
                    cond: { $eq: ['$$l.v.blank', true] }
                  }
                }
              },
              else: {
                $cond: {
                  if: { $isArray: '$lines' },
                  then: {
                    $size: {
                      $filter: {
                        input: '$lines',
                        as: 'l',
                        cond: { $eq: ['$$l.blank', true] }
                      }
                    }
                  },
                  else: 0
                }
              }
            }
          }
        }
      }
    ];

    if (roleMatch) {
      pipeline.push({ $match: roleMatch });
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
              tags: 1,
              iso_language_code: 1,
              language: 1,
              user: 1,
              collaborator_emails: 1,
              translations: 1,
              created_at: 1,
              updated_at: 1,
              archived: 1,
              blank_lines_count: 1,
            }
          }
        ]
      }
    });

    const [aggResult] = await this.sources.aggregate(pipeline).collation({ locale: 'en', strength: 2 });
    const total = aggResult?.total?.[0]?.count || 0;
    const items = aggResult?.items || [];

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      filterOptions
    };
  }

  async create(model: any) {
    return await this.sources.create(model);
  }

  async read({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }) {
    if (isadmin) {
      return toObject(await this.sources.findOne({ _id }));
    }
    const doc = await this.sources.findOne({ $or: [{ user }, { collaborator_emails: user }], _id });
    if (doc) return toObject(doc);

    // Allow read access if this source is linked as a translation variation to a source the user has access to
    const target = await this.sources.findOne({ _id });
    if (target) {
      const translationIds = Object.values(target.translations || {}).filter(Boolean);
      const hasAccess = await this.sources.exists({
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

  async update({ isadmin, user, _id, ...model }: { isadmin?: boolean, user: string, id: string, [key: string]: any }) {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.sources.updateOne(filter, model);
  }

  async remove({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }): Promise<any> {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.sources.deleteOne(filter);
  }

  async log({ id, log }) {
    await writeFile(
      `${this.STORAGE_PATH}/logs/${id}.log`,
      `${Date.now()} - ${JSON.stringify(log)}\n`,
      { flag: 'a' }
    );
  }
}
