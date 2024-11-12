const baseController = (service) => {
    
    const deleteItem = async (req, res, next) => {
     try {
         let request = req.body;
         let result = await service.deleteItem(request.id);
          res.send(result);
        } catch (error) {
            next(error);
        }
    };
    
    const deleteMany = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.deleteMany(request);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };

    const getByObjects = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.getByObjects(request);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };
    
    const getItem = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.getItem(request.id);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };       

    const putItem = async (req, res, next) => {
      try {
        let request = req.body;
        let result = await service.putItem(request);
        res.send(result);
      } catch (error) {
        next(error);
      }
    };

    const query = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.query(request);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };

    const scanTable = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.scanTable(request);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };

    const updateService = async (req, res, next) => {
        try {
            let request = req.body;
            let result = await service.updateService(request);
            res.send(result);
        } catch (error) {
            next(error);
        }
    };


    return {
        deleteItem,
        deleteMany,
    
        getByObjects,
        getItem,
    
        putItem,
    
        query,
    
        scanTable,
        
        updateService,
   
    };
};

module.exports.baseController = baseController;
