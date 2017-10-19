import { Component, ViewChild } from '@angular/core';
import { QueryService } from '../query.srv'

import * as d3 from 'd3';

@Component({
  selector: 'route-positions',
  templateUrl: './positions.comp.html'
})
export class PositionsRoute {
  @ViewChild('chart') chart

  // Universidade de Aveiro -> 0300
  //   Engenharia de Computadores e Telemática -> 9361
  //   Engenharia Eletrónica e Telecomunicações -> 9365
  // courses = [ { inst: '0300', code: '9361' }, { inst: '0300', code: '9365' }]
  institution = '0300'
  courses = ['9361', '9365']
  years = [2013, 2014, 2015, 2016]

  yearSelection = 2015

  color: d3.ScaleLinear<string, string>
  canvas: d3.Selection<any, {}, null, undefined>

  constructor(private qSrv: QueryService) {}

  ngAfterViewInit() {
    this.color = d3.scaleLinear<string>()
      .domain([0, 1, 2, 3, 4, 5])
      .range(["red", "green", "blue", "purple", "yellow", "black"])

    this.canvas = d3.select(this.chart.nativeElement)
  
    this.getTestData()
      .then(data => this.draw(this.transform(data)))
  }

  getTestData() {
    return new Promise<any[]>((resolve, reject) => {
      let data = [
        { course: "0300-9361", years: { 2015: [ 30, 20, 5, 3 ], 2016: [25, 10, 5, 1 ] } },
        { course: "0300-9365", years: { 2015: [ 35, 25, 10, 5, 2, 1 ], 2016: [40, 30, 6, 3, 1 ] } }
      ]

      resolve(data)
    })
  }

  getData() {
    let query = `
      MATCH (s:Student)-[:placed]->(a:Application)-[:on]->(c:Course)-[:of]->(i:Institution)
      WHERE i.code = '${this.institution}' AND c.code IN [${this.courses.map(_ => "'"+_+"'")}] AND a.year IN [${this.years}] 
      RETURN i.code AS institution, c.code AS course, a.year AS year, a.order AS option, count(DISTINCT s) AS placed
      ORDER BY course
    `

    return new Promise<any[]>((resolve, reject) => {
      this.qSrv.execQuery(query)
        .subscribe(results => {
          // group by course-code, year
          let data = d3.nest()
            .key((line: any) => line.institution + '-' + line.course)
            .key((line: any) => line.year)
            .entries(results as any[])
              .map(course => {
                let years = {}
                course.values.forEach(yeaLine => {
                  let year = []
                  years[yeaLine.key] = year
                  yeaLine.values.forEach(li => year[li.option - 1] = li.placed)
                })

                return {
                  course: course.key,
                  years: years
                }
              })
          
          resolve(data as any[])
        }, error => reject(error))
    })
  }

  transform(results: any[]) {
    // map the start position
    results.forEach(c => Object.keys(c.years).forEach(key => {
      let year = c.years[key]
      if (year.length > 0) {
        year[0] = { start: 0, value: year[0] | 0 }
        for(let i = 1; i < year.length; i++)
          year[i] = { start: year[i-1].start + year[i-1].value, value: year[i] | 0 }
      }
    }))

    return results
  }

  draw(data: any[]) {
    let barWidth = 57 //this.width / data.length

    let scale = d3.scaleLinear()
      .range([0, 400])
      .domain([0, d3.max(data, (course: any) => {
        let sum = 0
        course.years[this.yearSelection].forEach(placed => sum += placed.value)
        return sum
      })])

    let courseBar = this.canvas.selectAll("g")
      .data(data)
        .enter().append("g")
          .attr("transform", (d, i) => `translate(${i*barWidth}, 0)`)

    courseBar.selectAll(".placed")
      .data((course: any) => course.years[this.yearSelection])
        .enter().append("rect")
          .attr("class", "placed")
          .attr("y", (placed: any) => scale(placed.start))
          .attr("height", (placed: any) => scale(placed.value))
          .attr("width", barWidth - 7)
          .attr("fill", (_, i) => this.color(i))

    /*courseBar.selectAll(".option")
      .data((course: any) => [ course.years[this.yearSelection][0] ])
        .enter().append("rect")
          .attr("class", "option")
          .attr("y", 0)
          .attr("x", 51)
          .attr("height", (placed: any) => scale(placed.value))
          .attr("width", 5)
          .attr("fill", "red")
    */

  }
}