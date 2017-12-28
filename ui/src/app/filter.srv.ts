import { Injectable } from '@angular/core';

@Injectable()
export class FilterService {
  minYear: number
  maxYear: number

  courses: { inst: string, course: string, name: string}[] = []
}