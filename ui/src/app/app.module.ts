import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { routing } from './app.routes';

import {
  MatGridListModule, MatToolbarModule,
  MatTabsModule, MatButtonModule, MatIconModule, MatTooltipModule,
  MatInputModule, MatSliderModule
} from '@angular/material';

import { Ng2GoogleChartsModule } from 'ng2-google-charts';

import { AppComponent } from './app.component';
import { QueryService } from './query.srv';

import { HomeRoute }                   from './route/home.comp';
import { QueryRoute }                  from './route/query.comp';
import { ModelRoute }                  from './route/model.comp';

import { DemandRoute }                 from './route/demand.comp';
import { DemandCourseRoute }           from './route/demand-course.comp';

import { GradesRoute }                 from './route/grades.comp';
import { GradesCurveRoute }            from './route/grades-curve.comp';

@NgModule({
  bootstrap: [AppComponent],
  providers: [QueryService],
  declarations: [
    AppComponent, HomeRoute, QueryRoute, ModelRoute,
    DemandRoute, DemandCourseRoute,
    GradesRoute, GradesCurveRoute
  ],
  imports: [
    routing,
    Ng2GoogleChartsModule, FormsModule, ReactiveFormsModule,
    HttpClientModule, BrowserModule, BrowserAnimationsModule,
    MatGridListModule, MatToolbarModule,
    MatTabsModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatInputModule, MatSliderModule
  ]
})
export class AppModule { }
