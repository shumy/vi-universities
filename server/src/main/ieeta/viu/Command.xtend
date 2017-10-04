package ieeta.viu

import java.util.HashMap
import org.neo4j.graphdb.Node

class Command {
  def static void main(String[] args) {
    CSVReader.filesByYear("./csv")
      .forEach[year, files|
        val alunos = new HashMap<String, Node>
        
        println('''Processing («year»):''')
        files.forEach[ file |
          CSVReader.readFile(file).forEach[
            try {
              val biSize = get("BI").length
              val bi = '''«get("BI").substring(0, 3)»-«get("BI").substring(biSize - 3, biSize)»''' 
              val alunoUID = '''«bi»-«get("Nome")»'''
              println(alunoUID)
            } catch(Throwable err) {
              println(it)
              throw err
            }
            
          ]
        ]
      ]
  }
  
  def static void testCSV() {
    CSVReader.filesByYear("./csv")
      .filter[year, p2| year == 2017]
      .forEach[year, files|
        val ids = new HashMap<String, Integer>
        
        println('''Processing («year»):''')
        files.forEach[ file |
          CSVReader.readFile(file)
            .forEach[
              val uid = '''«get("BI")»-«get("Nome")»''' 
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
    
    val result = db.query('''
      MATCH (c:Car) <-[owner]- (p:Person)
      WHERE c.make = 'tesla'
      RETURN p.firstName, p.lastName
    ''')
    
    println(result.resultAsString)
  }
}