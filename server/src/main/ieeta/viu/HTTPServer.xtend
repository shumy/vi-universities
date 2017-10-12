package ieeta.viu

import static spark.Spark.*
import com.google.gson.Gson

class HTTPServer {
  //static val logger = LoggerFactory.getLogger(HTTPServer)
  
  def static start() {
    val gson = new Gson
    val db = new NeoDB("data/viu")
    
    staticFileLocation("/ui")
    
    after[req, res | res.type("application/json") ]
    
    get("/query/:cypher") [ req, res |
      res.header("Access-Control-Allow-Origin", "*")
      
      try {
        val cypher = req.params("cypher")
        val result = db.cypher(cypher).toList
        gson.toJson(result)
      } catch (Throwable err) {
        halt(500, err.message)
        return null
      }
    ]
  }
}