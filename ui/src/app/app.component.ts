import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  menu = 'query'
  
  queryFormControl = new FormControl('')

  columns = []
  dataSource = []

  constructor(private http: HttpClient) {}

  query() {
    let dataServer = 'http://localhost:4567/'

    let cypher = this.queryFormControl.value
    if (cypher == "") return

    this.http.get(dataServer + 'query/' + cypher).subscribe((data: any[]) => {
      this.columns = []
      if (data.length > 0) {
        let line = data[0]
        Object.keys(line).forEach(key => this.columns.push(key))
        this.dataSource = data
      }
    }, error => this.queryFormControl.setErrors({ backend: error.error }))
  }
}
