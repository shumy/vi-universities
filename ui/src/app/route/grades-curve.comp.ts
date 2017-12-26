import { DomSanitizer } from '@angular/platform-browser';
import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { QueryService } from '../query.srv'
import { FilterService } from '../filter.srv'

import * as d3 from 'd3';

@Component({
  selector: 'route-grades-curve',
  templateUrl: './grades-curve.comp.html'
})
export class GradesCurveRoute {
  @ViewChild('container') container
  @ViewChild('chart') chart

  // scale configs
  padding = { top: 20, right: 20, bottom: 35, left: 25 }

  // scale conventions
  width: number
  height: number
  innerWidth: number
  innerHeight: number

  //these should be from a global filter...
  minYear: number
  maxYear: number

  institutions = ['0300']
  courses = ['9361', '9365', '9119', 'G009' , '9251']

  // selections
  yearSelection: number
  selectedCourses = []
  dataSelection = []

  // data and meta-data loaded from server
  metaDataKeys: string[]
  metaData: {}
  data: any[]

  //d3 fixed elements
  color: d3.ScaleOrdinal<string, string>
  svg: d3.Selection<any, {}, null, undefined>

  //d3 elements dependent on data refresh
  scaleX: d3.ScaleLinear<number, number>
  scaleY: d3.ScaleLinear<number, number>

  //d3 elements dependent on resize and data refresh
  coursePaths: any

  getCourseColor(code: string) {
    let index = this.selectedCourses.indexOf(code)
    let color = index > -1 ? this.color(code): ""
    
    return this.sanitizer.bypassSecurityTrustStyle(color)
  }

  setCourseSelection(code: string) {
    let index = this.selectedCourses.indexOf(code)
    if (index > -1)
      this.selectedCourses.splice(index, 1)
    else
      this.selectedCourses.push(code)
    
    this.refresh()
    this.draw()
  }

  setYearSelection(yearValue) {
    this.yearSelection = yearValue
    this.refresh()
    this.draw()
  }

  constructor(private route: ActivatedRoute, private qSrv: QueryService, private fSrv: FilterService, private sanitizer: DomSanitizer) {
    this.minYear = fSrv.minYear
    this.maxYear = fSrv.maxYear
    
    this.yearSelection = this.maxYear
  }

  ngAfterViewInit() {
    this.init()
    this.resize()

    //redraw on resize - no data changes
    window.onresize = (event) => {
      this.resize()
      this.redraw()
    }

    //get data
    this.qSrv.getCourses(this.institutions, this.courses).then(md => {
      this.metaDataKeys = Object.keys(md)
      this.metaData = md

      this.route.queryParams.subscribe(params => {
        console.log('COURSES: ', params.courses)
        if (params.courses == null)
          this.metaDataKeys.forEach(code => this.selectedCourses.push(code))
        else
          this.selectedCourses = params.courses

        this.getData().then(results => {
          this.data = results
          this.refresh()
          this.draw()
        })
      })
    })
  }

  getData() {
    /*
    MATCH (s:Student)<-[:from]-(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution) 
    WHERE i.code IN ['0300'] AND c.code IN ['9361', '9365', '9119', 'G009' , '9251']
      AND a.year IN range(2014, 2017)
    WITH a.year AS year, i.code AS inst, c.code AS course, a.grade AS grade
    ORDER BY year, inst, course, grade DESC
    WITH year, { inst: inst, course: course, grades: collect(grade) } AS grades_per_course
    RETURN year, collect(grades_per_course) as courses
    ORDER BY year
    */
    let query = `
      MATCH (s:Student)-[:placed]->(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution) 
      WHERE i.code IN [${this.institutions.map(_ => "'"+_+"'")}] AND c.code IN [${this.courses.map(_ => "'"+_+"'")}]
        AND a.year IN range(${this.minYear}, ${this.maxYear})
      WITH a.year AS year, i.code AS inst, c.code AS course, a.grade AS grade
      ORDER BY year, inst, course, grade DESC
      WITH year, { inst: inst, course: course, grades: collect(grade) } AS grades_per_course
      RETURN year, collect(grades_per_course) as courses
      ORDER BY year
    `

    return new Promise<any[]>((resolve, reject) => {
      this.qSrv.execQuery(query)
        .subscribe((results: any[]) => {
          results.forEach(line => line.courses.forEach(c => {
            let cCode = c.inst + '-' + c.course
            c.code = cCode
            c.course = this.metaData[cCode].short
            
            delete c.inst
          }))
          
          console.log(results)
          resolve(results)
        }, error => reject(error))
    })
  }

  // process fixed d3 elements
  init() {
    console.log('INIT')

    this.color = d3.scaleOrdinal(d3.schemeCategory10)

    this.scaleX = d3.scaleLinear()
    
    this.scaleY = d3.scaleLinear()
      .domain([90, 200])
  }

  // process d3 elements only related with data
  refresh() {
    console.log('REFRESH')
    let courses = this.data.filter(_ => _.year == this.yearSelection)[0].courses
    this.dataSelection = courses.filter(c => this.selectedCourses.indexOf(c.code) > -1)
    
    let max = d3.max(this.dataSelection, line => line.grades.length)

    this.scaleX.domain([0, max])

    this.clear()
  }

  clear() {
    let chart = this.chart.nativeElement
    while (chart.firstChild)
      chart.removeChild(chart.firstChild)
  }

  // process d3 elements related with new data
  draw() {
    console.log('DRAW')
    this.clear()

    this.svg = d3.select(this.chart.nativeElement)
      .append("g")
        .attr("transform", `translate(${this.padding.left}, ${this.padding.top})`)

    this.svg.append("g").attr("class", "x-axis")
    this.svg.append("g").attr("class", "y-axis")

    this.coursePaths = this.svg.selectAll(".course")
      .data(this.dataSelection)
        .enter().append("path")
          .attr("class", "course")
          .attr("fill", "none")
          .attr("stroke-width", 2)
          .attr("stroke", c => this.color(c.code))
    
    this.redraw()

    //will this work ?
    this.coursePaths.exit().remove()
  }

  // process width/height
  resize() {
    console.log('RESIZE', this.container)

    this.width = this.container.nativeElement.offsetWidth - 10
    this.height = this.container.nativeElement.offsetHeight - 10

    this.innerWidth = this.width - this.padding.left - this.padding.right
    this.innerHeight = this.height - this.padding.top - this.padding.bottom
  }

  // redraw d3 elements
  redraw() {
    console.log('REDRAW')

    d3.select(this.chart.nativeElement)
      .attr("width", this.width)
      .attr("height", this.height)

    this.scaleX.range([0, this.innerWidth])
    this.scaleY.range([this.innerHeight, 0])

    let xAxis = d3.axisBottom(this.scaleX)
    let yAxis = d3.axisLeft(this.scaleY)

    this.svg.select(".x-axis")
      .attr("transform", `translate(0, ${this.innerHeight})`)
      .call(xAxis)

    this.svg.select(".y-axis")
      .call(yAxis)
    
    this.coursePaths
      .attr("d", c => {
        let path = "M" + (0 + ' ' + this.scaleY(c.grades[0]))
        for (let i = 1; i < c.grades.length; i++) {
          let grade = c.grades[i]
          path += (' L ' + this.scaleX(i) + ' ' + this.scaleY(grade))
        }
        
        return path
      })
  }
}