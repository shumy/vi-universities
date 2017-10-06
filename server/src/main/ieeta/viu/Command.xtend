package ieeta.viu

import java.util.HashMap

class Command {
  def static void main(String[] args) {
    val path = args.get(0)
    
    val db = new NeoDB("data/test", false)
    
    new CSVReader().parseFile(path).forEach[ line |
      db.tx[
        //create Student...
        db.cypher('''
          MERGE (a:Student { uid: $UID })
          ON CREATE SET
            a.name = $Nome,
            a.grade_12 = $Nota12,
            a.grade_10_11 = $Nota10_11
        ''', line)
        
        //create Institution and Course
        for (var n = 1; n < 7; n++) {
          if (line.get("OpcaoInstituicaoCodigo" + n) !== null) {
            db.cypher('''
              MERGE (i:Institution { code: $OpcaoInstituicaoCodigo«n» })
              ON CREATE SET
                i.name = $OpcaoInstituicaoNome«n»
            ''', line)
            
            db.cypher('''
              MATCH (i:Institution { code: $OpcaoInstituicaoCodigo«n» })
              MERGE (c:Course { code: $OpcaoCursoCodigo«n» })-[:belongs_to]->(i)
              ON CREATE SET
                c.name = $OpcaoCursoNome«n»
            ''', line)
          }
        }
      ]
    ]
    
    println('Students -> ' + db.cypher('MATCH (a:Student) RETURN count(a) as n').head.get('n'))
    println(db.cypher('''
      MATCH (a:Student)
      RETURN a.uid, a.name, a.grade_12, a.grade_10_11 LIMIT 5
    ''').resultAsString)
    
    println('Institutions -> ' + db.cypher('MATCH (i:Institution) RETURN count(i) as n').head.get('n'))
    println(db.cypher('''
      MATCH (i:Institution)
      RETURN i.code, i.name LIMIT 5
    ''').resultAsString)
    
    println('Courses -> ' + db.cypher('MATCH (c:Course) RETURN count(c) as n').head.get('n'))
    println(db.cypher('''
      MATCH (c:Course)
      RETURN c.code, c.name LIMIT 5
    ''').resultAsString)
    
    println(db.cypher('''
      MATCH (c:Course)-[:belongs_to]->(i:Institution)
      RETURN i.code, i.name, c.code, c.name LIMIT 5
    ''').resultAsString)
  }
  
  def static void testCSV() {
    new CSVReader().filesByYear("./csv")
      .filter[year, p2| year == 2017]
      .forEach[year, files|
        val ids = new HashMap<String, Integer>
        
        println('''Processing («year»):''')
        files.forEach[ file |
          new CSVReader().parseFile(file)
            .forEach[
              val uid = get("UID") as String
              val counter = ids.get(uid)?: 0
              ids.put(uid, counter + 1)
              
              if (uid == "149(...)73-FRANCISCO OLIVEIRA SURRADOR") {
                println('''«file»:''')
                forEach[key, value| println('''  «key» -> «value»''') ]
              }
                
            ]
        ]
        
        ids.filter[bi, counter| counter > 1]
          .forEach[bi, counter| println('''  «bi»: «counter»''') ]
        
      ]
  }
  
  def static void testNeo() {
    val db = new NeoDB("data/test", false)
    db.tx[
      val car = node("Car", #{"make" -> "tesla", "model" -> "model3"})
      val owner = node("Person", #{"firstName" -> "Micael", "lastName" -> "Pedrosa"})
      edge(owner, car, "owner")
    ]
    
    val result = db.cypher('''
      MATCH (c:Car) <-[owner]- (p:Person)
      WHERE c.make = 'tesla'
      RETURN p.firstName, p.lastName
    ''')
    
    println(result.resultAsString)
  }
}