const authService = require("./authService");
const folderQuery = require("../queries/folders");


const getAccountFolders = async (request, response) => {
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(400).json({message: 'Access denied'});
        } else {
            if (result.permissionLevel > 5) {
                response.status(200).json(await folderQuery.getAllAccountFolders());
            } else {
                response.status(200).json(await folderQuery.getAccountFolders(result.userId));
            }
        }
    });
}

const getAccountFoldersEditable = async (request, response) => {
    await authService.authorizeToken(request.headers.authorization).then(async result => {
        if (result.status === 'error') {
            response.status(400).json({message: 'Access denied'});
        } else {
            response.status(200).json(await folderQuery.getAccountFoldersEditable(result.userId));
        }
    });
}

module.exports = {
    getAccountFolders,
    getAccountFoldersEditable
}