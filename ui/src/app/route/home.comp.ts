import { Component } from '@angular/core';
import { QueryService } from '../query.srv'
import { FilterService } from '../filter.srv'

@Component({
  selector: 'route-home',
  templateUrl: './home.comp.html'
})
export class HomeRoute {
  ready = false

  minYear: number
  maxYear: number

  applicationsByYear =  {
    chartType: 'PieChart',
    options: { pieHole: 0.4, width: 800, height: 600, backgroundColor: '#f5f5f5' },
    columns: ['Year', 'Applications per Year'],
    dataTable: []
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

  setData(dataStruct: any, cypher: string, lineTransform: (line: any)=>string[]) {
    this.qSrv.execQuery(cypher).subscribe((results: any[]) => {
      dataStruct.dataTable = [ dataStruct.columns ]
      results.map(lineTransform)
        .forEach(line => dataStruct.dataTable.push(line))
      
      this.ready = true
    })
  }
}
