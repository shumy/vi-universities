import { Component } from '@angular/core'
import { QueryService } from '../query.srv'
import { FilterService } from '../filter.srv'

import {FormControl} from '@angular/forms'

import {Observable} from 'rxjs/Observable'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/map'

interface Option {
  code: string
  name: string
}

@Component({
  selector: 'route-home',
  templateUrl: './home.comp.html'
})
export class HomeRoute {
  ready = false

  minYear: number
  maxYear: number

  institutionControl: FormControl = new FormControl()
  institutionFilteredOptions: Observable<Option[]>

  courseControl: FormControl = new FormControl()
  courseFilteredOptions: Observable<Option[]>

  selectedInst: Option
  selectedCourse: Option

  applicationsByYear =  {
    chartType: 'PieChart',
    options: { pieHole: 0.4, width: 800, height: 600, backgroundColor: '#f5f5f5' },
    columns: ['Year', 'Applications per Year'],
    dataTable: []
  }

  setSelectedInstitution(option: Option) {
    this.selectedInst = option
    this.courseControl.reset()

    this.qSrv.getCoursesList(option.code).then(list => {
      this.courseFilteredOptions = this.courseControl.valueChanges
        .startWith(null)
        .map(val => val ? this.filter(list, val) : list.slice())
    })
  }

  setSelectedCourse(option: Option) {
    this.selectedCourse = option
    console.log('ADD: ', this.selectedInst, this.selectedCourse)
    this.fSrv.courses.push({ inst: this.selectedInst.code, course: this.selectedCourse.code, name: this.selectedCourse.name })
  }

  setMinYearSelection(value: number) {
    this.fSrv.minYear = value
  }

  setMaxYearSelection(value: number) {
    this.fSrv.maxYear = value
  }

  constructor(private qSrv: QueryService, private fSrv: FilterService) {
    this.qSrv.getTotalYearRange().then(range => {
      this.minYear = range.min
      this.maxYear = range.max

      if (fSrv.minYear == null)
        fSrv.minYear = this.minYear
      
      if (fSrv.maxYear == null)
        fSrv.maxYear = this.maxYear
    })

    this.setData(
      this.applicationsByYear,
      "MATCH (s:Student)-[:placed]->(a:Application) RETURN a.year as year, count(s) as total ORDER BY year",
      line => [line.year + "", line.total]
    )
  }

  ngOnInit() {
    this.qSrv.getInstitutionsList().then(list => {
      this.institutionFilteredOptions = this.institutionControl.valueChanges
        .startWith(null)
        .map(val => val ? this.filter(list, val) : list.slice())
    })
  }

  displayFn(option: Option): string {
    return option == null ? '' : option.name
  }

  filter(list: Option[], val: string): Option[] {
    if (typeof val != "string") return null

    return list.filter(option =>
      option.name.toLowerCase().indexOf(val.toLowerCase()) === 0)
  }

  remove(item: { inst: string, course: string, name: string}) {
    let index = this.fSrv.courses.indexOf(item)
    if (index > -1)
      this.fSrv.courses.splice(index, 1)
  }

  setData(dataStruct: any, cypher: string, lineTransform: (line: any)=>string[]) {
    this.qSrv.execQuery(cypher).subscribe((results: any[]) => {
      dataStruct.dataTable = [ dataStruct.columns ]
      results.map(lineTransform)
        .forEach(line => dataStruct.dataTable.push(line))
      
      this.ready = true
    })
  }
}
