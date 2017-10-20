import { Component, ViewChild } from '@angular/core';
import { QueryService } from '../query.srv'

import * as d3 from 'd3';

@Component({
  selector: 'route-positions',
  templateUrl: './positions.comp.html'
})
export class PositionsRoute {
  @ViewChild('chart') chart

  //scale configs
  padding = { top: 20, right: 20, bottom: 20, left: 25 }

  //scale conventions
  width: number //= 800
  height: number //= 500

  innerWidth: number
  innerHeight: number

  // Universidade de Aveiro -> 0300
  //   Engenharia de Computadores e Telemática -> 9361
  //   Engenharia Eletrónica e Telecomunicações -> 9365
  //   Engenharia Informática -> 9119
  //   Engenharia Computacional -> G009
  //   Tecnologias e Sistemas de Informação -> 9251

  institution = '0300'
  courses = ['9361', '9365', '9119', 'G009' , '9251']
  years = [2013, 2014, 2015, 2016]

  //client filters
  yearSelection = 2013

  data: any[]

  //d3 fixed elements
  color: d3.ScaleLinear<string, string>
  svg: d3.Selection<any, {}, null, undefined>

  //d3 elements dependent on data refresh
  scaleX: d3.ScaleBand<string>
  scaleY: d3.ScaleLinear<number, number>

  //d3 elements dependent on resize and data refresh
  courseBars: any
  dataBars: any

  constructor(private qSrv: QueryService) {}

  ngAfterViewInit() {
    this.init()
    this.resize()

    //redraw on resize - no data changes
    window.onresize = (event) => {
      this.resize()
      this.redraw()
    }

    //refresh data
    this.getData().then(results => {
      this.data = this.transform(results)
      this.refresh()
      this.draw()
    })
  }

  getTestData() {
    return new Promise<any[]>((resolve, reject) => {
      let data = [
        { course: "0300-9361", years: { 2015: [ 30, 20, 5, null, 3 ], 2016: [25, 10, 5, 1 ] } },
        { course: "0300-9365", years: { 2015: [ 35, 25, 10, 5, 2, 1 ], 2016: [40, 30, 6, 3, 1 ] } }
      ]

      resolve(data)
    })
  }

  getData() {
    let query = `
      MATCH (s:Student)-[:placed]->(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution)
      WHERE i.code = '${this.institution}' AND c.code IN [${this.courses.map(_ => "'"+_+"'")}] AND a.year IN [${this.years}]
      WITH i.code AS institution, c.code AS course, a.year AS year, { option: a.order, placed: count(DISTINCT s) } AS options_sum
      WITH institution, course, { year: year, options: collect(options_sum) } as years_col
      RETURN institution, course, collect(years_col) as years
      ORDER BY institution, course
    `

    return new Promise<any[]>((resolve, reject) => {
      this.qSrv.execQuery(query)
        .subscribe((results: any[]) => {
          let data = results.map(line => {
            let years = {}
            line.years.forEach(yeaLine => {
              let year = []
              years[yeaLine.year] = year
              yeaLine.options.forEach(li => year[li.option - 1] = li.placed)
            })

            return {
              course: line.institution + '-' + line.course,
              years: years
            }
          })
          
          resolve(data)
        }, error => reject(error))
    })
  }

  transform(results: any[]) {
    // map the start position
    results.forEach(c => Object.keys(c.years).forEach(key => {
      let year = c.years[key]
      if (year.length > 0) {
        year[0] = { start: 0, value: year[0] || 0 }
        for(let i = 1; i < year.length; i++)
          year[i] = { start: year[i-1].start + year[i-1].value, value: year[i] || 0 }
      }
    }))

    console.log(results)
    return results
  }

  // process fixed d3 elements
  init() {
    console.log('INIT')

    this.scaleX = d3.scaleBand()
    this.scaleY = d3.scaleLinear()

    this.color = d3.scaleLinear<string>()
      .domain([0, 1, 2, 3, 4, 5])
      .range(["red", "green", "blue", "purple", "yellow", "black"])

    this.svg = d3.select(this.chart.nativeElement)
      .append("g")
        .attr("transform", `translate(${this.padding.left}, ${this.padding.top})`)
      
    this.svg.append("g").attr("class", "x-axis")
    this.svg.append("g").attr("class", "y-axis")
  }

  // process d3 elements only related with data
  refresh() {
    console.log('REFRESH')

    //max values of total placed 
    let max = d3.max(this.data, (course: any) => {
      let sum = 0
      let year: any = course.years[this.yearSelection]
      if (year != null)
        year.forEach(placed => sum += placed.value)

      return sum
    })

    //xAxis labels from results
    let xAxisKeys = this.data.map(line => line.course)

    this.scaleX
      .domain(xAxisKeys)
      .padding(0.3)
    
    this.scaleY
      .domain([0, max])
  }

  // process d3 elements related with new data
  draw() {
    console.log('DRAW')

    this.courseBars = this.svg.selectAll(".course")
      .data(this.data)
        .enter().append("g")
          .attr("class", "course")
        
    this.dataBars = this.courseBars.selectAll(".placed")
      .data((course: any) => course.years[this.yearSelection] || [])
        .enter().append("rect")
          .attr("class", "placed")

    this.redraw()

    //will this work ?
    this.courseBars.exit().remove()
  }

  // process width/height
  resize() {
    console.log('RESIZE')

    this.width = window.innerWidth - 10
    this.height = window.innerHeight - 100

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

    this.courseBars
      .attr("transform", (line) => `translate(${this.scaleX(line.course)}, ${this.innerHeight}) scale(1, -1)`)

    this.dataBars
      .attr("y", (placed: any) => this.innerHeight - this.scaleY(placed.start))
      .attr("height", (placed: any) => this.innerHeight - this.scaleY(placed.value))
      .attr("width", this.scaleX.bandwidth())
      .attr("fill", (_, i) => this.color(i))
  }
}