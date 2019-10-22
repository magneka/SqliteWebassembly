/* eslint-disable no-return-await */
getRepositoryFactory = db => (fields, table) => {
  // ----------------------------------------------------------------------------------------
  // Fields lists
  // ----------------------------------------------------------------------------------------

  // getIdField
  const getIdField = () => fields.map((f) => f.fieldName).shift()
  // getNonIdFields
  const getNonIdFields = () => fields.map((f) => f.fieldName).slice(1)
  // getAllFields
  const getAllFields = () => fields.map((f) => f.fieldName)

  // transform json object to array with fields in correct order for insert and update
  // getParmsInOrder
  const getParmsInOrder = (jsonObj, forUpdate = false) => {
      const validFieldNames = getNonIdFields(fields)
  
      let paramArr = validFieldNames.reduce((res, fieldname) => {
        if (jsonObj.hasOwnProperty(fieldname)) res.push(jsonObj[fieldname])
        else res.push(null)
        return res
      }, [])
  
      if (forUpdate) {
        paramArr.push(jsonObj[getIdField()])
      }
  
      return paramArr
    }

  // ----------------------------------------------------------------------------------------
  // Generators for SQL Statements
  // ----------------------------------------------------------------------------------------

  // getCreateStatement
  const getCreateStatement = () => fields.reduce((res, x, i) => {
      if (i === 0) {
        return `${res}${x.fieldName} integer primary key`
      } else if (i !== fields.length - 1) {
        return `${res}, ${x.fieldName} ${x.dataType}`
      } else {
        return `${res}, ${x.fieldName} ${x.dataType})`
      }
    }, [`CREATE TABLE IF NOT EXISTS ${table} (`])
  
  // getSelectStatement             - select a, b, .. from table
  const getSelectStatement = () => `SELECT ${getAllFields().join(', ')} FROM ${table}`
  // getSelectStatementById         - select a, b, .. from table where id = 1
  const getSelectStatementById = () => `${getSelectStatement()} WHERE ${getIdField()} = ?`
  // getSelectStatementIn           - select a, b, .. from table where a in 1, 2, 3
  const getSelectStatementIn = (parm) => `${getSelectStatement()} WHERE ${getIdField()} in (${parm.map(() => '?').join(', ')})`
  // getSelectStatementByFieldName  - select a, b, .. from table where b = 1
  const getSelectStatementByFieldName = (searchBy) => `${getSelectStatement()} WHERE ${searchBy} = ?`
  // getInsertStatement             - insert into table (a, b, c) values (1, 2, 3)
  const getInsertStatement = () => `INSERT INTO ${table} (${getNonIdFields().join(', ')}) VALUES (` 
  + getNonIdFields().map(() => '?').join(', ') + ')'
  // getUpdateByIdStatement         - update table set b=1, c=2 where id = 1
  const getUpdateByIdStatement = () => `UPDATE ${table} SET ${getNonIdFields().map((f) => f + ' = ?').join(', ')}  WHERE ${getIdField()} = ?` 
  // getDeleteByIdStatement         - delete from table where a = 1
  const getDeleteByIdStatement = () => `DELETE FROM ${table} WHERE ${getIdField()} = ?`
  // getLastId                      - select rowid from table order by rowid desc limit 1
  const getLastId = () => `SELECT rowid from ${table} order by ROWID DESC limit 1`
  
  // ----------------------------------------------------------------------------------------
  // DB driver calls
  // ----------------------------------------------------------------------------------------

  const dbRun = (query, parameters) => { 
    console.log('query', query, 'parameters', parameters)    
    let result = db.run(query, parameters) 
    return result;
  }
  
  const dbSingle = (query, parameters) => {    
    let result = dbAll(query, parameters)
    if (result[0] === undefined)
      return result
    return result[0]  
  }

  const dbAll = (query, parameters) => {    
    let result = db.exec (query, parameters)
    result[0] ? console.log('a') : console.log('b') 
    /*(result[0] !== undefined) ? dbres : result[0].values.map((x, i) => {        
      let resObj = {}
      result[0].columns.forEach((colname, j) => resObj[colname] = x[j]) 
      return resObj
    })*/  
    
    
    if (result[0] === undefined)
      return result
      
    let mappedResult = result[0].values.map((x, i) => {        
      let resObj = {}
      result[0].columns.forEach((colname, j) => resObj[colname] = x[j]) 
      return resObj
    })    
    return mappedResult;   
  }

  // run like this
  // const getAllCustomers = () => dbAll("SELECT * FROM Employee", []);

  // ----------------------------------------------------------------------------------------
  // Exported functions
  // ----------------------------------------------------------------------------------------

  // createTable
  const createTable = () => dbRun(getCreateStatement(), [])
  // insert
  const insert = (jsonObj) => {
     dbRun(getInsertStatement(), getParmsInOrder(jsonObj)); 
     let newId = dbSingle(getLastId()); 
     return { 
       ...jsonObj, 
       [getIdField()]: newId.Id 
      } 
  }
  // selectAll
  const selectAll = () => dbAll(getSelectStatement(), [])
  // selectWherId
  const selectWherId = (id) => dbSingle(getSelectStatementById(), [id])
  // selectWherIn
  const selectWherIn = (parm) => dbAll(getSelectStatementIn(parm), parm)
  // selectWhereField
  const selectWhereField = (field, parm) => dbAll(getSelectStatementByFieldName(field), parm)
  // updateById
  const updateById = (jsonObj) => dbRun(getUpdateByIdStatement(), getParmsInOrder(jsonObj, true))
  // deleteById 
  const deleteById = (id) => dbRun(getDeleteByIdStatement(), [id])

  const logQueries = () => {
    console.log('==================================================================')
    console.log('fields', fields)
    console.log('tablename', table)
    console.log('getIdField:', getIdField())
    console.log('getNonIdFields:', getNonIdFields())
    console.log('getSelectStatementByFieldName:', getSelectStatementByFieldName('LastName'))
    console.log('getSelectStatementById:', getSelectStatementById())
    console.log('getInsertStatement:', getInsertStatement())
    console.log('getUpdateStatement:', getUpdateByIdStatement())
    console.log('getDeleteStatementById:', getDeleteByIdStatement())
    console.log('getCreateStatement:', getCreateStatement())
  }

  return {
    selectAll: selectAll,
    selectById: selectWherId,
    selectWhereIn: selectWherIn,
    selectByField: selectWhereField,
    create: createTable,
    insert: insert,
    update: updateById,
    delete: deleteById,
    displayQueries: logQueries,
  }
}
