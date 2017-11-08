import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../environments/environment';

@Injectable()
export class QueryService {
  
  constructor(private http: HttpClient) {}

  getCourse(institution: string, course: string) {
    let query = `
      MATCH (c:Course)-[:of]->(i:Institution)
      WHERE i.code = '${institution}' AND c.code = '${course}'
      RETURN i.name as institution, c.name as course
    `

    return new Promise<{institution: string, course: string}>((resolve, reject) => {
      this.execQuery(query).subscribe((results: any[]) => {
        let data = results[0]
        
        console.log('getCourse -> ', data)
        resolve(data)
      }, error => reject(error))
    })
  }

  getCourses(institutions: string[], courses: string[]) {
    let query = `
      MATCH (c:Course)-[:of]->(i:Institution)
      WHERE i.code IN [${institutions.map(_ => "'"+_+"'")}] AND c.code IN [${courses.map(_ => "'"+_+"'")}]
      RETURN i.code, i.name, c.code, c.name
    `

    return new Promise<{}>((resolve, reject) => {
      this.execQuery(query).subscribe((results: any[]) => {
        let data = {}
        results.forEach(line => {
          let cName = ""
          for(let char of line['c.name']) {
            if(char >= 'A' && char <= 'Z')
              cName += char
          }
          
          let cCode = line['i.code'] + '-' + line['c.code']
          data[cCode] = { short: cName, name: line['c.name'] }
        })
        
        console.log('getCourses -> ', data)
        resolve(data)
      }, error => reject(error))
    })
  }

  execQuery(cypher: string) {
    console.log('QUERY: ', cypher)
    return this.http.get(environment.apiUrl + 'query/' + cypher)
  }

}