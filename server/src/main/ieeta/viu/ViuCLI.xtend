package ieeta.viu

import java.util.HashMap
import picocli.CommandLine
import picocli.CommandLine.Command
import picocli.CommandLine.Option
import picocli.CommandLine.Parameters
import org.slf4j.LoggerFactory

@Command(
  name = "viu-cli", footer = "Copyright(c) 2017",
  description = "VIU CLI Helper"
)
class RCommand {
  @Parameters(index = "0", description = "Execute a Cypher query.")
  public String query
  
  @Option(names = #["--stack"], help = true, description = "Display the stack trace error if any.")
  public boolean stack
  
  @Option(names = #["-h", "--help"], help = true, description = "Display this help and exit.")
  public boolean help
  
  @Option(names = #["-l", "--load"], help = true, description = "Load CSV file.")
  public String path
}

class ViuCLI {
  static val logger = LoggerFactory.getLogger(ViuCLI)
  
  def static void main(String[] args) {
    val cmd =  try {
      CommandLine.populateCommand(new RCommand, args)
    } catch (Throwable ex) {
      CommandLine.usage(new RCommand, System.out)
      return
    }
    
    try {
      if (cmd.help) {
        CommandLine.usage(new RCommand, System.out)
        return
      }
      
      if (cmd.path !== null)
        loadFile(cmd.path)
      
      if (cmd.query !== null) {
        val db = new NeoDB("data/viu")
        println(db.cypher(cmd.query).resultAsString)
      }
      
    } catch (Throwable ex) {
      if (cmd.stack)
        ex.printStackTrace
      else
        println(ex.message)
    }
  }
  
  def static loadFile(String path) {
    val db = new NeoDB("data/viu", false)
    
    val students = db.cypher('MATCH (a:Student) RETURN count(a) as n').head.get('n') as Long
    val institutions = db.cypher('MATCH (i:Institution) RETURN count(i) as n').head.get('n') as Long
    val courses = db.cypher('MATCH (c:Course) RETURN count(c) as n').head.get('n') as Long
    val applications = db.cypher('MATCH (:Student)-[a:application]->(:Course) RETURN count(a) as n').head.get('n') as Long
    
    new CSVReader().parseFile(path).forEach[ line |
      db.tx[
        //create Student...
        db.cypher('''
          MERGE (s:Student { uid: $UID })
          ON CREATE SET
            s.name = $Nome,
            s.grade_12 = $Nota12,
            s.grade_10_11 = $Nota10_11
        ''', line)
        
        for (var n = 1; n < 7; n++) {
          if (line.get("OpcaoInstituicaoCodigo" + n) !== null) {
            //create Institution
            db.cypher('''
              MERGE (i:Institution { code: $OpcaoInstituicaoCodigo«n» })
              ON CREATE SET
                i.name = $OpcaoInstituicaoNome«n»
            ''', line)
            
            //create Course and link to Institution, Application
            /*
            MERGE (s)-[a:application]->(c)
              ON CREATE SET
              a.grade = $OpcaoNotaCandidatura«n»,
              a.contingent = $OpcaoContingente«n»,
              a.applicant_order = $OpcaoOrdemCandidato«n»
            */
            db.cypher('''
              MATCH (i:Institution { code: $OpcaoInstituicaoCodigo«n» })
              MERGE (c:Course { code: $OpcaoCursoCodigo«n» })-[:belongs_to]->(i)
                ON CREATE SET
                  c.name = $OpcaoCursoNome«n»
            ''', line)
            
            //create Application
            if (line.get("OpcaoNotaCandidatura" + n) !== null)
              db.cypher('''
                MATCH (s:Student { uid: $UID }), (c:Course { code: $OpcaoCursoCodigo«n» })-[:belongs_to]->(i:Institution { code: $OpcaoInstituicaoCodigo«n» })
                MERGE (s)-[a:application]->(c)
                  ON CREATE SET
                  a.year = $Year,
                  a.grade = $OpcaoNotaCandidatura«n»,
                  a.contingent = $OpcaoContingente«n»,
                  a.applicant_order = $OpcaoOrdemCandidato«n»
              ''', line)
            else
              logger.warn('''Non existent grade: (uid=«line.get("UID")», application=«n»)''')
          }
        }
      ]
    ]
    
    val newStudents = db.cypher('MATCH (a:Student) RETURN count(a) as n').head.get('n') as Long
    val newInstitutions = db.cypher('MATCH (i:Institution) RETURN count(i) as n').head.get('n') as Long
    val newCourses = db.cypher('MATCH (c:Course) RETURN count(c) as n').head.get('n') as Long
    val newApplications = db.cypher('MATCH (:Student)-[a:application]->(:Course) RETURN count(a) as n').head.get('n') as Long
    
    println('''Students (total=«newStudents», loaded=«newStudents-students»)''')
    println('''Institutions (total=«newInstitutions», loaded=«newInstitutions-institutions»)''')
    println('''Courses (total=«newCourses», loaded=«newCourses-courses»)''')
    println('''Applications (total=«newApplications», loaded=«newApplications-applications»)''')
    
    
    println(db.cypher('''
      MATCH (s:Student)-[a:application]->(c:Course)
      WHERE s.uid = '135*368-NELSON DE JESUS RODRIGUES'
      RETURN a.applicant_order, a.year, a.grade, a.contingent, c.name
    ''').resultAsString)
    
    /*
    println(db.cypher('''
      MATCH (a:Student)
      RETURN a.uid, a.name, a.grade_12, a.grade_10_11 LIMIT 5
    ''').resultAsString)
    
    
    println(db.cypher('''
      MATCH (i:Institution)
      RETURN i.code, i.name LIMIT 5
    ''').resultAsString)
    
    
    println(db.cypher('''
      MATCH (c:Course)
      RETURN c.code, c.name LIMIT 5
    ''').resultAsString)
    
    println(db.cypher('''
      MATCH (c:Course)-[:belongs_to]->(i:Institution)
      RETURN i.code, i.name, c.code, c.name LIMIT 5
    ''').resultAsString)
    */
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