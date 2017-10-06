package ieeta.viu

import java.io.File
import java.util.Map
import org.eclipse.xtend.lib.annotations.Accessors
import org.neo4j.graphdb.GraphDatabaseService
import org.neo4j.graphdb.Label
import org.neo4j.graphdb.Node
import org.neo4j.graphdb.RelationshipType
import org.neo4j.graphdb.factory.GraphDatabaseFactory
import org.neo4j.graphdb.factory.GraphDatabaseSettings
import org.slf4j.LoggerFactory

class NeoDB {
  static val logger = LoggerFactory.getLogger(NeoDB)
  
  @Accessors val GraphDatabaseService db
  
  new(String path) { this(path, true) }
  new(String path, boolean readOnly) {
    val dbFile = new File(path)
    val builder = new GraphDatabaseFactory().newEmbeddedDatabaseBuilder(dbFile)
    if (readOnly) builder.setConfig(GraphDatabaseSettings.read_only, "true")
    
    db = builder.newGraphDatabase
    Runtime.runtime.addShutdownHook(new Thread[db.shutdown])
    logger.info('OPEN-DB: ' + path)
  }
  
  def void shutdown() {
    logger.info('SHUTDOWN-DB')
    db.shutdown
  }
  
  def node(String label, Map<String, String> props) {
    db.createNode(Label.label(label)) => [
      for (kv: props.entrySet)
        setProperty(kv.key, kv.value)
    ]
  }
  
  def edge(Node left, Node right, String name) {
    left.createRelationshipTo(right, RelationshipType.withName(name))
  } 
  
  def void tx((NeoDB)=>void txHandler) {
    val tx = db.beginTx
    try {
      txHandler.apply(this)
      tx.success
    } catch(Throwable err) {
      logger.error("TX: " + err.message)
    } finally {
      tx.close
    }
  }
  
  def cypher(String cypher) {
    //logger.debug('''QUERY («cypher»)''')
    db.execute(cypher)
  }
  
  def cypher(String cypher, Map<String, Object> params) {
    //logger.debug('''QUERY («cypher»)''')
    db.execute(cypher, params)
  }
}