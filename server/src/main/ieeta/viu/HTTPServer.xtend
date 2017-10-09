package ieeta.viu

import static spark.Spark.*
import org.slf4j.LoggerFactory
import com.google.gson.Gson

class HTTPServer {
  //static val logger = LoggerFactory.getLogger(HTTPServer)
  
  def static start() {
    val gson = new Gson
    val db = new NeoDB("data/viu")
    
    staticFileLocation("/ui")
    externalStaticFileLocation("/ui")
    
    after[req, res | res.type("application/json") ]
    
    get("/query/:cypher") [ req, res |
      val cypher = req.params("cypher")
      val result = db.cypher(cypher).toList
      gson.toJson(result)
    ]
  }
}