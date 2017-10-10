import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  MatGridListModule, MatToolbarModule,
  MatTabsModule, MatButtonModule, MatIconModule,
  MatInputModule
} from '@angular/material';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [ AppComponent ],
  imports: [
    FormsModule, ReactiveFormsModule,
    HttpClientModule, BrowserModule, BrowserAnimationsModule,
    MatGridListModule, MatToolbarModule,
    MatTabsModule, MatButtonModule, MatIconModule,
    MatInputModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
