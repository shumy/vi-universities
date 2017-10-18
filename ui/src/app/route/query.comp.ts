import { Component, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';

import { QueryService } from '../query.srv'

@Component({
  selector: 'route-query',
  templateUrl: './query.comp.html'
})
export class QueryRoute {
  queryFormControl = new FormControl('')

  columns = []
  dataSource = []

  constructor(private qSrv: QueryService) {}

  query() {
    let cypher = this.queryFormControl.value
    if (cypher == "") return

    this.qSrv.execQuery(cypher).subscribe((data: any[]) => {
      this.columns = []
      if (data.length > 0) {
        let line = data[0]
        Object.keys(line).forEach(key => this.columns.push(key))
        this.dataSource = data
      }
    }, error => this.queryFormControl.setErrors({ backend: error.error }))
  }
}
