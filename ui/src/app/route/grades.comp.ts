import { DomSanitizer } from '@angular/platform-browser';
import { Component, ViewChild } from '@angular/core';
import { QueryService } from '../query.srv'

import * as d3 from 'd3';

@Component({
  selector: 'route-grades',
  templateUrl: './grades.comp.html'
})
export class GradesRoute {
  @ViewChild('container') container
  @ViewChild('chart') chart

  // scale configs
  padding = { top: 20, right: 20, bottom: 35, left: 25 }

  // scale conventions
  width: number
  height: number
  innerWidth: number
  innerHeight: number

  // TODO: these should be from a global filter...
  institutions = ['0300']
  courses = ['9361', '9365', '9119', 'G009' , '9251']
  minYear = 2007
  maxYear = 2016

  // selections
  selectedCourses = []

  // data and meta-data loaded from server
  metaDataKeys: string[]
  metaData: {}
  data: any[]

  //d3 fixed elements
  color: d3.ScaleOrdinal<string, string>
  svg: d3.Selection<any, {}, null, undefined>

  //d3 elements dependent on data refresh
  scaleX: d3.ScaleBand<string>
  scaleY: d3.ScaleLinear<number, number>

  //d3 elements dependent on resize and data refresh
  yearBars: any
  dataBars: any

  avgCircles: any
  maxLines: any
  minLines: any
  rangeLines: any

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

    this.clear()
    this.draw()
  }

  constructor(private qSrv: QueryService, private sanitizer: DomSanitizer) {}

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
      this.getData().then(results => {
        this.data = results
        this.refresh()
        this.draw()
      })
    })
  }

  getData() {
    let query = `
      MATCH (s:Student)-[:placed]->(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution)
      WHERE i.code IN [${this.institutions.map(_ => "'"+_+"'")}] AND c.code IN [${this.courses.map(_ => "'"+_+"'")}]
        AND a.year IN range(${this.minYear}, ${this.maxYear})
      WITH a.year AS year, { inst: i.code, course: c.code, max: max(a.grade), min: min(a.grade), avg: avg(a.grade) } AS grades_per_course
      ORDER BY grades_per_course.inst, grades_per_course.course
      RETURN year, collect(grades_per_course) as grades
      ORDER BY year
    `

    return new Promise<any[]>((resolve, reject) => {
      this.qSrv.execQuery(query)
        .subscribe((results: any[]) => {
          results.forEach(line => line.grades.forEach(c => {
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

    this.scaleX = d3.scaleBand()
    
    this.scaleY = d3.scaleLinear()
                      .domain([90, 200])
  }

  // process d3 elements only related with data
  refresh() {
    console.log('REFRESH')

    //xAxis labels from results
    let xAxisKeys = this.data.map(line => line.year)

    this.scaleX
      .domain(xAxisKeys)
      .padding(0.3)
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

    this.yearBars = this.svg.selectAll(".year")
      .data(this.data)
        .enter().append("g")
          .attr("class", "year")
        
    this.dataBars = this.yearBars.selectAll(".grade")
      .data((line: any) => line.grades.filter(c => this.selectedCourses.indexOf(c.code) > -1))
        .enter().append("g")
          .attr("class", "grade")

    this.maxLines = this.dataBars
      .append("line")
        .attr("class", "max")
        .attr("stroke-width", 1)
        .attr("stroke", c => this.color(c.code))

    this.minLines = this.dataBars
      .append("line")
        .attr("class", "min")
        .attr("stroke-width", 1)
        .attr("stroke", c => this.color(c.code))
    
    this.rangeLines = this.dataBars
      .append("line")
        .attr("class", "range")
        .attr("stroke-width", 1)
        .attr("stroke", c => this.color(c.code))
    
    this.avgCircles = this.dataBars
      .append("circle")
        .attr("class", "avg")
        .attr("fill", c => this.color(c.code))
        .on("mousemove", c => {
          d3.select(".chart-tooltip")
            .style("visibility", "visible")
            .style("left", d3.event.pageX - 28 + "px")
            .style("top", d3.event.pageY - 50 + "px")
            .html(`<strong>${c.course}</strong>
                    <br>Max: ${Math.round(c.max * 10)/10}
                    <br>Avg: ${Math.round(c.avg * 10)/10}
                    <br>Min: ${Math.round(c.min * 10)/10}
                  `)
        })
        .on("mouseout", _ => d3.select(".chart-tooltip").style("visibility", "hidden"))

    this.redraw()

    //will this work ?
    this.yearBars.exit().remove()
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

    this.yearBars
      .attr("transform", (line) => `translate(${this.scaleX(line.year)}, ${this.innerHeight}) scale(1, -1)`)

    let serieSize = this.scaleX.bandwidth() / this.metaDataKeys.length
    console.log(serieSize)

    //avg circles
    this.avgCircles
      .attr("r", 5)
      .attr("cy", c => this.innerHeight - this.scaleY(c.avg))
      .attr("cx", (_, i) => i*serieSize)
    
    //max line
    this.maxLines
      .attr("y1", c => this.innerHeight - this.scaleY(c.max))
      .attr("x1", (_, i) => i*serieSize - 3)
      .attr("y2", c => this.innerHeight - this.scaleY(c.max))
      .attr("x2", (_, i) => i*serieSize + 3)

    //min line
    this.minLines
      .attr("y1", c => this.innerHeight - this.scaleY(c.min))
      .attr("x1", (_, i) => i*serieSize - 3)
      .attr("y2", c => this.innerHeight - this.scaleY(c.min))
      .attr("x2", (_, i) => i*serieSize + 3)

    //min to max line (range)
    this.rangeLines
      .attr("y1", c => this.innerHeight - this.scaleY(c.min))
      .attr("x1", (_, i) => i*serieSize)
      .attr("y2", c => this.innerHeight - this.scaleY(c.max))
      .attr("x2", (_, i) => i*serieSize)
  }
}