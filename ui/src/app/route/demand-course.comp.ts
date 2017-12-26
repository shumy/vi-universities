import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { QueryService } from '../query.srv'
import { FilterService } from '../filter.srv'

import * as d3 from 'd3';

/* TODO: ideas for this chart
  1. Add % on each course option
*/

@Component({
  selector: 'route-demand-course',
  templateUrl: './demand-course.comp.html'
})
export class DemandCourseRoute {
  @ViewChild('container') container
  @ViewChild('chart') chart

  // scale configs
  padding = { top: 20, right: 20, bottom: 35, left: 25 }

  // scale conventions
  width: number
  height: number
  innerWidth: number
  innerHeight: number

  // these should be from a global filter...
  minYear: number
  maxYear: number
  
  institutions = ['0300']
  courses = ['9361', '9365', '9119', 'G009' , '9251']

  // selections
  courseName: string
  selectedCourseCode: string
  selectedInst: string
  selectedCourse: string

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
  lineBars: any
  placedBars: any
  dataBars: any

  setCourseSelection(course: string) {
    let splits = course.split('-')
    this.selectedCourseCode = course
    this.selectedInst = splits[0]
    this.selectedCourse = splits[1]
    this.courseName = this.metaData[course].name

    this.getData().then(results => {
      this.data = this.transform(results)
      this.refresh()
      this.draw()
    })
  }

  constructor(private route: ActivatedRoute, private qSrv: QueryService, private fSrv: FilterService) {
    this.minYear = fSrv.minYear
    this.maxYear = fSrv.maxYear
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
    this.route.queryParams.subscribe(params => {
      this.qSrv.getCourses(this.institutions, this.courses).then(md => {
        this.metaDataKeys = Object.keys(md)
        this.metaData = md
        this.setCourseSelection(params.course)
      })
    })
  }

  getTestData() {
    return new Promise<any[]>((resolve, reject) => {
      let data = [
        { year: 2015, options: [ 35, 25, 10, 5, 2, 1 ] },
        { year: 2014, options: [ 30, 20, 5, null, 3 ] },
        { year: 2016, options: [25, 10, 5, 1 ] }
      ]

      resolve(data)
    })
  }

  getData() {
    /* original
      MATCH (s:Student)-[:placed]->(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution)
      WHERE i.code = '${this.selectedInst}' AND c.code = '${this.selectedCourse}'
        AND a.year IN range(${this.minYear}, ${this.maxYear})
      WITH a.year AS year, { order: a.order, placed: count(DISTINCT s) } AS options_sum
      RETURN year, collect(options_sum) as options
      ORDER BY year
    */

    let query = `
      MATCH (s:Student)-[r]-(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution)
      WHERE i.code = '${this.selectedInst}' AND c.code = '${this.selectedCourse}'
        AND a.year IN range(${this.minYear}, ${this.maxYear})
      WITH a.year AS year, { type: type(r), order: a.order, number: count(DISTINCT s) } AS options_sum
      RETURN year, collect(options_sum) as options
      ORDER BY year
    `
    return new Promise<any[]>((resolve, reject) => {
      this.qSrv.execQuery(query).subscribe((results: any[]) => {
        let data = results.map(line => {
          let newLine = { year: line.year, placed: 0, options: []}
          
          line.options.forEach(opt => {
            if (opt.type == 'from')
              newLine.options[opt.order - 1] = opt.number
            else
              newLine.placed += opt.number
          })

          return newLine
        })

        resolve(data)
      }, error => reject(error))
    })
  }

  transform(results: any[]) {
    // map the start position
    results.forEach(line => {
      let options = line.options
      if (options.length > 0) {
        options[0] = { start: 0, value: options[0] || 0 }
        for(let i = 1; i < options.length; i++)
          options[i] = { start: options[i-1].start + options[i-1].value, value: options[i] || 0 }
      }
    })

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

    //max values of total options
    let max = d3.max(this.data, line => d3.max(line.options, (opt: any) => opt.start as number + opt.value as number))

    //xAxis labels from results
    let xAxisKeys = this.data.map(line => line.year)

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

    this.lineBars = this.svg.selectAll(".bar")
      .data(this.data)
        .enter().append("g")
          .attr("class", "bar")
    
    this.placedBars = this.lineBars.append("rect")
      .attr("class", "placed")
      .attr("fill", this.color(0))
      .attr("y", 0)
      .on("mousemove", (line) => {
        d3.select(".chart-tooltip")
          .style("visibility", "visible")
          .style("left", d3.event.pageX - 28 + "px")
          .style("top", d3.event.pageY - 50 + "px")
          .html(`Placed <br>${line.placed}`)
      })
      .on("mouseout", _ => d3.select(".chart-tooltip").style("visibility", "hidden"))

    this.dataBars = this.lineBars.selectAll(".demand")
      .data(line => line.options)
        .enter().append("rect")
          .attr("class", "demand")
          .on("mousemove", (demand, index) => {
            d3.select(".chart-tooltip")
              .style("visibility", "visible")
              .style("left", d3.event.pageX - 28 + "px")
              .style("top", d3.event.pageY - 50 + "px")
              .html(`Option ${index + 1}<br>${demand.value}`)
          })
          .on("mouseout", _ => d3.select(".chart-tooltip").style("visibility", "hidden"))

    this.redraw()

    //will this work ?
    this.lineBars.exit().remove()
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

    this.lineBars
      .attr("transform", (line) => `translate(${this.scaleX(line.year)}, ${this.innerHeight}) scale(1, -1)`)

    let bandMargin = this.scaleX.bandwidth()/10
    let band = this.scaleX.bandwidth() - 2*bandMargin

    //placed
    this.placedBars
      .attr("x", band + 1.5*bandMargin)
      .attr("width", 4*bandMargin)
      .attr("height", (line: any) => this.innerHeight - this.scaleY(line.placed))
      //.attr("fill", this.color(7))

    //demand
    this.dataBars
      .attr("x", bandMargin)
      .attr("width", band)
      .attr("y", (option: any) => this.innerHeight - this.scaleY(option.start))
      .attr("height", (option: any) => this.innerHeight - this.scaleY(option.value))
      .attr("fill", (_, i) => this.color(i))
  }
}