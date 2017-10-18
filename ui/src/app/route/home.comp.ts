import { Component, ChangeDetectorRef } from '@angular/core';
import { QueryService } from '../query.srv'

@Component({
  selector: 'route-home',
  templateUrl: './home.comp.html'
})
export class HomeRoute {
  applicationsByYear =  {
    chartType: 'PieChart',
    options: { title: 'Applications per Year', pieHole: 0.4, width: 800, height: 600 },
    columns: ['Year', 'Applications per Year'],
    dataTable: []
  }

  constructor(private qSrv: QueryService, private change: ChangeDetectorRef) {
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
      this.change.detectChanges()
    })
  }
}
