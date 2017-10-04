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
  
  static val nameMapper = #[
    "NumeroCandidatoCurso",
    "BI",
    "Nome",
    "NotaCandidaturaCurso",
    "OpcaoCurso",
    "PI",
    "12",
    "10/11",
    "Resultado",
    
    "ColocInstituicaoCodigo",
    "ColocInstituicaoNome",
    "ColocCursoCodigo",
    "ColocCursoNome",
    "Tipo",
    
    "ColocOrdemCurso",
    
    "1-OpcaoInstituicaoCodigo",
    "1-OpcaoInstituicaoNome",
    "1-OpcaoCursoCodigo",
    "1-OpcaoCursoNome",
    "1-OpcaoNotaCandidatura",
    "1-OpcaoContingente",
    "1-OpcaoOrdemCandidato",
    
    "2-OpcaoInstituicaoCodigo",
    "2-OpcaoInstituicaoNome",
    "2-OpcaoCursoCodigo",
    "2-OpcaoCursoNome",
    "2-OpcaoNotaCandidatura",
    "2-OpcaoContingente",
    "2-OpcaoOrdemCandidato",
    
    "3-OpcaoInstituicaoCodigo",
    "3-OpcaoInstituicaoNome",
    "3-OpcaoCursoCodigo",
    "3-OpcaoCursoNome",
    "3-OpcaoNotaCandidatura",
    "3-OpcaoContingente",
    "3-OpcaoOrdemCandidato",
    
    "4-OpcaoInstituicaoCodigo",
    "4-OpcaoInstituicaoNome",
    "4-OpcaoCursoCodigo",
    "4-OpcaoCursoNome",
    "4-OpcaoNotaCandidatura",
    "4-OpcaoContingente",
    "4-OpcaoOrdemCandidato",
    
    "5-OpcaoInstituicaoCodigo",
    "5-OpcaoInstituicaoNome",
    "5-OpcaoCursoCodigo",
    "5-OpcaoCursoNome",
    "5-OpcaoNotaCandidatura",
    "5-OpcaoContingente",
    "5-OpcaoOrdemCandidato",
    
    "6-OpcaoInstituicaoCodigo",
    "6-OpcaoInstituicaoNome",
    "6-OpcaoCursoCodigo",
    "6-OpcaoCursoNome",
    "6-OpcaoNotaCandidatura",
    "6-OpcaoContingente",
    "6-OpcaoOrdemCandidato"
  ]
  
  def static filesByYear(String dir) {
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
  
  def static readFile(String filePath) {
    logger.info('''Reading file: «filePath»''')
    
    val lineNumber = new AtomicInteger(0)
    val path = Paths.get(filePath)
    Files.lines(path)
      .map[ split(";") ]
      .map[
        lineNumber.andIncrement
        
        val map = new LinkedHashMap<String, String>
        for (var n = 0; n < length; n++) {
          if (n >= nameMapper.length) {
            logger.error('''Line to long at: (file=«filePath», line=«lineNumber», items=«n»)''')
            return null
          }
            
          map.put(nameMapper.get(n), get(n))
        }
        
        map as Map<String, String>
      ]
      .filter[ it !== null]
  }
}