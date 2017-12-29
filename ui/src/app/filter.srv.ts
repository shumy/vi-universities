import { Injectable } from '@angular/core';
import * as Cookies  from "js-cookie";

export interface CourseFilter {
  inst: string
  course: string
  name: string
}

@Injectable()
export class FilterService {
  set minYear(val: number) { Cookies.set("minYear", val + "") }
  get minYear(): number {
    let val = Cookies.get("minYear")
    return val == null ? null : parseInt(val)
  }

  set maxYear(val: number) { Cookies.set("maxYear", val + "") }
  get maxYear(): number {
    let val = Cookies.get("maxYear")
    return val == null ? null : parseInt(val)
  }

  private _courses: CourseFilter[]

  get courses(): CourseFilter[] {
    console.log('COURSES: ', this._courses)
    if (this._courses == null) {
      let val = Cookies.get("courses")
      this._courses = val == null ? [] : JSON.parse(val)
    }

    return this._courses
  }

  getCoursesMap() {
    let data = {}
    this.courses.forEach(_ => {
      let cCode = _.inst + '-' + _.course
      
      let cName = ""
      for(let char of _.name) {
        if(char >= 'A' && char <= 'Z')
          cName += char
      }

      data[cCode] = { name: _.name, short: cName }
    })

    console.log('getCoursesMap -> ', data)
    return data
  }

  addCourse(item: CourseFilter) {
    //do nothing if duplicate found
    for (let next of this._courses)
      if (item.inst == next.inst && item.course == next.course)
        return

    this._courses.push(item)
    Cookies.set("courses", JSON.stringify(this._courses))
  }

  removeCourse(item: CourseFilter) {
    //find position and remove it
    for (let i = 0; i < this._courses.length; i++)
    if (item.inst == this._courses[i].inst && item.course == this._courses[i].course) {
      this._courses.splice(i, 1)
      break
    }

    Cookies.set("courses", JSON.stringify(this._courses))
  }
}