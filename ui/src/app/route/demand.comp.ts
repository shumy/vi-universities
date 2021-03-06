import { Component, ViewChild } from '@angular/core';

import { QueryService } from '../query.srv'
import { FilterService } from '../filter.srv'

import * as d3 from 'd3';

/*
  Using resize method:
    1. Update and redraw: https://blog.webkid.io/responsive-chart-usability-d3/
    2. Using constant viewBox: https://chartio.com/resources/tutorials/how-to-resize-an-svg-when-the-window-is-resized-in-d3-js/
  
    <svg width="700" height="500" viewBox="0 -540 723 540" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(25, 20) scale(1, -1)">
      </g>
    </svg>

    TODO: ideas for this chart
  1. Add % on each course option.
  2. Add color legend.
  3. Selectable options.
*/

@Component({
  selector: 'route-demand',
  templateUrl: './demand.comp.html'
})
export class DemandRoute {
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

  // selections
  yearSelection: number

  // data and meta-data loaded from server
  metaDataKeys: string[]
  metaData: {}
  data: any[]

  //d3 fixed elements
  color: any//d3.ScaleLinear<string, string>
  svg: d3.Selection<any, {}, null, undefined>

  //d3 elements dependent on data refresh
  scaleX: d3.ScaleBand<string>
  scaleY: d3.ScaleLinear<number, number>

  //d3 elements dependent on resize and data refresh
  courseBars: any
  dataBars: any

  setYearSelection(yearValue) {
    this.yearSelection = yearValue
    this.refresh()
    this.draw()
  }

  constructor(private qSrv: QueryService, private fSrv: FilterService) {
    this.minYear = fSrv.minYear
    this.maxYear = fSrv.maxYear
    
    this.yearSelection = this.maxYear

    this.metaData = this.fSrv.getCoursesMap()
    this.metaDataKeys = Object.keys(this.metaData)
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
      WHERE (i.code + '-' + c.code) IN [${this.metaDataKeys.map(_ => "'"+_+"'")}]
        AND a.year IN range(${this.minYear}, ${this.maxYear})
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
            line.years.forEach(yearLine => {
              let year = []
              years[yearLine.year] = year
              yearLine.options.forEach(li => year[li.option - 1] = li.placed)
            })

            let cCode = line.institution + '-' + line.course
            return {
              code: cCode,
              course: this.metaData[cCode].short,
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

    this.color = d3.scaleOrdinal(d3.schemeCategory10)

    //this.color = d3.scaleLinear<string>()
    //  .domain([0, 1, 2, 3, 4, 5])
    //  .range(["#00008B", "#8B0000", "#228B22", "#9400D3", "#1E90FF", "#FFA500"])
      //.range([ "#570AB2", "#AB0AB2", "#B20A65", "#B20A11", "#B2570A", "#B2AB0A"])
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

    this.courseBars = this.svg.selectAll(".course")
      .data(this.data)
        .enter().append("g")
          .attr("class", "course")
        
    this.dataBars = this.courseBars.selectAll(".placed")
      .data((course: any) => course.years[this.yearSelection] || [])
        .enter().append("rect")
          .attr("class", "placed")
          .on("mousemove", (placed, index) => {
            d3.select(".chart-tooltip")
              .style("visibility", "visible")
              .style("left", d3.event.pageX - 28 + "px")
              .style("top", d3.event.pageY - 50 + "px")
              .html(`Option ${index + 1}<br>${placed.value}`)
          })
          .on("mouseout", _ => d3.select(".chart-tooltip").style("visibility", "hidden"))

    this.redraw()

    //will this work ?
    this.courseBars.exit().remove()
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

    this.courseBars
      .attr("transform", (line) => `translate(${this.scaleX(line.course)}, ${this.innerHeight}) scale(1, -1)`)

    this.dataBars
      .attr("y", (placed: any) => this.innerHeight - this.scaleY(placed.start))
      .attr("height", (placed: any) => this.innerHeight - this.scaleY(placed.value))
      .attr("width", this.scaleX.bandwidth())
      .attr("fill", (_, i) => this.color(i))
  }
}