import { Component } from '@angular/core';
import { UserAdminService } from './user-admin.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-admin',
  templateUrl: './user-admin.component.html',
  styleUrls: ['./user-admin.component.less']
})
export class UserAdminComponent {

  private __areyousure = 'Are you sure that you want to proceed?';
  actions = [
    { label: 'Update Roles', icon: 'pi pi-shield', command: () => this.dialog = 'update-role' },
    {
      label: 'Generate Password Update Tokens', icon: 'pi pi-envelope',
      command: () => { if (confirm(this.__areyousure)) this.genUpdatePassTokens() }
    },
    { separator: true },
    {
      label: 'Activate', icon: 'pi pi-check',
      command: () => { if (confirm(this.__areyousure)) this.toggle(true); }
    },
    {
      label: 'Deactive', icon: 'pi pi-ban',
      command: () => { if (confirm(this.__areyousure)) this.toggle(false); }
    },
    {
      label: 'Delete', icon: 'pi pi-trash',
      command: () => { if (confirm(this.__areyousure)) this.removeUsers(); }
    },
  ];

  dialog: 'create' | 'update-role' | boolean = false;
  model: any = {};

  users = [];
  selected: any[] = [];

  constructor(
    private router: Router,
    private service: UserAdminService,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.selected = [];
    this.service.list().subscribe({
      next: (users: any) => this.users = users
    });
  }

  createUsers() {
    this.service.create(this.model).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    })
  }

  getSelecteds() { return this.selected.filter(obj => !obj.itIsMe); }

  updateRoles() {
    const data = this.getSelecteds().map(obj => ({ ...obj, roles: this.model.roles }));
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  toggle(active: boolean) {
    const data = this.getSelecteds().map(obj => ({ ...obj, active }));
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  removeUsers() {
    const data = this.getSelecteds().map(obj => obj.email);
    this.service.update({ action: 'delete', data }).subscribe({
      next: (resp: any) => this.reload(),
      error: (error: any) => { console.log(error) },
    });
  }

  genUpdatePassTokens() {
    const data = this.getSelecteds().map(obj => obj.email);
    this.service.genUpdatePassTokens(data).subscribe({
      next: (resp: any) => {
        const baseHref = document.querySelector('base')?.href;
        resp.forEach((each: any) => each.link = `${baseHref}#/update-password?token=${each.token}&expires=${each.expires}`);
        const blob = new Blob([JSON.stringify(resp)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'update-password-tokens.json';
        anchor.style.display = 'none';

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        URL.revokeObjectURL(url);
      },
      error: (error: any) => { console.log(error) },
    });
  }

  updateFullname(user: any) {
    const fullname = prompt('Enter new fullname:', user.fullname);
    if (fullname || fullname != user.fullname)
      this.service.update({ action: 'update-fullname', data: [{ ...user, fullname }] }).subscribe({
        next: (resp: any) => this.reload(),
        error: (error: any) => { console.log(error) },
      });
  }
}