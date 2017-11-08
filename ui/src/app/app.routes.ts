import { ModuleWithProviders }         from '@angular/core';
import { Routes, RouterModule }        from '@angular/router';

import { HomeRoute }                   from './route/home.comp';
import { QueryRoute }                  from './route/query.comp';
import { ModelRoute }                  from './route/model.comp';

import { DemandRoute }                 from './route/demand.comp';
import { DemandCourseRoute }                 from './route/demand-course.comp';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeRoute },
  { path: 'demand', component: DemandRoute },
  { path: 'demand/demand-course', component: DemandCourseRoute },

  { path: 'query', component: QueryRoute },
  { path: 'model', component: ModelRoute },
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);