import { ModuleWithProviders }         from '@angular/core';
import { Routes, RouterModule }        from '@angular/router';

import { HomeRoute }                   from './route/home.comp';
import { QueryRoute }                  from './route/query.comp';
import { ModelRoute }                  from './route/model.comp';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeRoute },
  { path: 'query', component: QueryRoute },
  { path: 'model', component: ModelRoute }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);