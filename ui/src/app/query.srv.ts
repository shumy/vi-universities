import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../environments/environment';

@Injectable()
export class QueryService {
  
  constructor(private http: HttpClient) {}

  execQuery(cypher: string) {
    return this.http.get(environment.apiUrl + 'query/' + cypher)
  }

}