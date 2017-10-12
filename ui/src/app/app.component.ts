import { Component, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  menu = 'visual'
  queryFormControl = new FormControl('')

  columns = []
  dataSource = []

  //charts data...
  applicationsByYear =  {
    chartType: 'PieChart',
    options: { title: 'Applications per Year', pieHole: 0.4, width: 800, height: 600 },
    columns: ['Year', 'Applications per Year'],
    dataTable: []
  }

  constructor(private http: HttpClient, private change: ChangeDetectorRef) {
    this.setData(
      this.applicationsByYear,
      "MATCH (s:Student)-[:placed]->(a:Application) RETURN a.year as year, count(s) as total ORDER BY year",
      line => [line.year + "", line.total]
    )
  }

  query() {
    let cypher = this.queryFormControl.value
    if (cypher == "") return

    this.execQuery(cypher).subscribe((data: any[]) => {
      this.columns = []
      if (data.length > 0) {
        let line = data[0]
        Object.keys(line).forEach(key => this.columns.push(key))
        this.dataSource = data
      }
    }, error => this.queryFormControl.setErrors({ backend: error.error }))
  }

  execQuery(cypher: string) {
    return this.http.get(environment.apiUrl + 'query/' + cypher)
  }

  setData(dataStruct: any, cypher: string, lineTransform: (line: any)=>string[]) {
    this.execQuery(cypher).subscribe((results: any[]) => {
      dataStruct.dataTable = [ dataStruct.columns ]
      results.map(lineTransform)
        .forEach(line => dataStruct.dataTable.push(line))
      this.change.detectChanges()
    })
  }
}
