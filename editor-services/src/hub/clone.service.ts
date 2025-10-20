import { Injectable, NotFoundException } from '@nestjs/common';
import { HubService } from './hub.service';
import { toObject, useId } from 'src/utils';
import { CompilerService } from 'src/compiler-service/compiler.service';

@Injectable()
export class CloneService {

  constructor(
    private service: HubService,
    private compiler: CompilerService,
  ) { }

  async clone(activity: any) {
    const exists = await this.service.getActivity(activity.id);
    if (!exists || !exists.published)
      throw new NotFoundException();

    // validate items
    const vitems = exists.items.map(i => i.item);
    activity.items = activity.items.filter((i: any) => vitems.includes(i.item));

    const user = activity.user;
    activity.tags = activity.tags?.map((t: string) => t.trim()).filter((t: string) => t);
    activity.collaborator_emails = activity.collaborator_emails?.map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);

    // clone sources
    for (const item of activity.items) {
      const source = toObject(await this.service.getSource(item.item));
      if (!source) continue;

      source.archived = false;
      source.tags = activity.tags;
      source.collaborator_emails = activity.collaborator_emails;

      // clone source
      const { _id, user: $dum1, ...others } = source;
      const srcClone = useId(toObject(
        await this.service.createSource({ ...others, user, name: item.details.name })));

      // update item id
      item.item = srcClone.id;
      item.details.language = srcClone.language;
      item.details.tags = srcClone.tags;

      // compile source
      const c_items = [{ item$: { ...srcClone, id: `${srcClone.id}_example` }, type: 'example' }];
      const challenge = Object.keys(srcClone.lines).filter(ln => srcClone.lines[ln].blank);
      if (challenge) c_items.push({ item$: { ...srcClone, id: `${srcClone.id}_challenge` }, type: 'challenge' });
      await this.compiler.compile({ id: srcClone.id, name: srcClone.name, items: c_items });
    }

    if (!activity.sourcesOnly) {
      // clone activity
      const { name, items, collaborator_emails } = activity;
      for (let i = 0; i < items.length; i++) items[i] = {
        item: items[i].item,
        type: items[i].type,
        details: {
          name: items[i].details.name,
          description: items[i].details.description,
          language: items[i].details.language,
          tags: items[i].details.tags,
        }
      };

      // compile activity
      const actClone = useId(toObject(await this.service.createActivity({ user, name, items, collaborator_emails })));
      await this.compiler.compile(actClone);
    }

    return {};
  }
}