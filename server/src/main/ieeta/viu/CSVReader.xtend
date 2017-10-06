package ieeta.viu

import java.nio.file.Paths
import java.nio.file.Files
import java.util.HashMap
import java.util.Map
import java.util.List
import java.util.ArrayList
import org.slf4j.LoggerFactory
import java.util.LinkedHashMap
import java.util.concurrent.atomic.AtomicInteger

class CSVReader {
  static val logger = LoggerFactory.getLogger(CSVReader)
  
  val List<String> fieldMapper
  val Map<String, (String)=>Object> fieldParser
  
  new() {
    fieldMapper = newArrayList(#[
      "NumeroCandidatoCurso",
      "BI",
      "Nome",
      "NotaCandidaturaCurso",
      "OpcaoCurso",
      "PI",       //Provas de Ingresso 50%
      "Nota12",
      "Nota10_11",
      
      "Resultado",
      "ColocInstituicaoCodigo",
      "ColocInstituicaoNome",
      "ColocCursoCodigo",
      "ColocCursoNome",
      "Tipo",
      
      "ColocOrdemCurso"
    ])
    
    for(var n = 1; n < 7; n++) {
      fieldMapper.add("OpcaoInstituicaoCodigo" + n)
      fieldMapper.add("OpcaoInstituicaoNome" + n)
      fieldMapper.add("OpcaoCursoCodigo" + n)
      fieldMapper.add("OpcaoCursoNome" + n)
      fieldMapper.add("OpcaoNotaCandidatura" + n)
      fieldMapper.add("OpcaoContingente" + n)
      fieldMapper.add("OpcaoOrdemCandidato" + n)
    }
    
    fieldParser = new HashMap(#{
      "BI" -> [ String it | '''«substring(0, 3)»*«substring(length - 3, length)»'''.toString ],
      "NumeroCandidatoCurso" -> [ Integer.parseInt(it) ],
      "NotaCandidaturaCurso" -> [ String it | Float.parseFloat(replace(',', '.')) ],
      
      "OpcaoCurso" -> [ Integer.parseInt(it) ],
      "PI" -> [ String it | Float.parseFloat(replace(',', '.')) ],
      "Nota12" -> [ Integer.parseInt(it) ],
      "Nota10_11" -> [ Integer.parseInt(it) ],
      
      "Resultado" -> [ if (it == "Colocado" || it == "Colocada") true else false ],
      
      "ColocInstituicaoCodigo" -> [ Integer.parseInt(it) ],
      "ColocCursoCodigo" -> [ Integer.parseInt(it) ]
    })
    
    for(var n = 1; n < 7; n++) {
      fieldParser.put("OpcaoInstituicaoCodigo" + n, [ Integer.parseInt(it) ])
      fieldParser.put("OpcaoCursoCodigo" + n,[ Integer.parseInt(it) ])
      fieldParser.put("OpcaoNotaCandidatura" + n, [ String it | Float.parseFloat(replace(',', '.')) ])
      fieldParser.put("OpcaoOrdemCandidato" + n, [ Integer.parseInt(it) ])
    }
  }
  
  def filesByYear(String dir) {
    val years = new HashMap<Integer, List<String>>
    
    Files.list(Paths.get(dir)).forEach[
      val path = toString
      
      try {
        val year = Integer.parseInt(path.substring(path.length - 4, path.length))
        var yearMap = years.get(year)
        if (yearMap === null) {
          yearMap = new ArrayList
          years.put(year, yearMap)
        }
        
        yearMap.add(path)
      } catch(Throwable err) {
        logger.warn('''(«err.message») Ignoring path: «path»''')
      }
    ]
    
    return years as Map<Integer, List<String>>
  }
  
  def parseFile(String filePath) {
    logger.info('''Parsing file: «filePath»''')
    
    //construct Year
    val year = try {
      Integer.parseInt(filePath.substring(filePath.length - 4, filePath.length))
    } catch(Throwable err) {
      logger.error('''No correct file path to extract the Year: (file=«filePath»)''')
      return null
    }
    
    val lineNumber = new AtomicInteger(0)
    val path = Paths.get(filePath)
    Files.lines(path)
      .map[ split(";") ]
      .map[
        lineNumber.andIncrement
        val fieldMap = new LinkedHashMap<String, Object>
        
        for (var n = 0; n < length; n++) {
          if (n >= fieldMapper.length) {
            logger.error('''Line to long at: (file=«filePath», line=«lineNumber», items=«n»)''')
            return null
          }
          
          val key = fieldMapper.get(n)
          val rawValue = get(n)
          
          try {
            if (!rawValue.empty) {
              val parser = fieldParser.get(key)
              val value = if (parser !== null) parser.apply(rawValue) else rawValue
              fieldMap.put(key, value)
            }
          } catch(Throwable err) {
            logger.error('''Parsing field (file=«filePath», line=«lineNumber», field=«key», value=«rawValue»): «err.class»''')
            return null
          }
        }
        
        //put Year in line
        fieldMap.put("Year", year)
        
        //put UID in line
        fieldMap.put("UID", '''«fieldMap.get("BI")»-«fieldMap.get("Nome")»'''.toString)
        
        return fieldMap as Map<String, Object>
      ]
      .filter[ it !== null]
  }
}