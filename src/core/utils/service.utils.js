import { Result, ResultAsync } from './Result.js';

/**
 * Fetches all entities from a repository and maps them to a DTO schema.
 * @param {object} repository - The repository instance with a `findAll` method.
 * @param {object} dtoSchema - The Zod schema for parsing the response DTO.
 * @param {object} logger - The logger instance.
 * @param {string} entityName - The name of the entity for logging purposes (e.g., 'game', 'player').
 * @returns {ResultAsync<Array, Error>} A ResultAsync containing an array of DTOs or an error.
 */
export const fetchAllAndMapToDto = (repository, dtoSchema, logger, entityName) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      logger.info(`Attempting to retrieve all ${entityName}s.`);
      return await repository.findAll();
    }),
  )
    .map((items) => items.map((item) => dtoSchema.parse(item)))
    .tap((items) =>
      logger.info(`Successfully retrieved ${items.length} ${entityName}s.`),
    )
    .tapError((error) =>
      logger.error(`Failed to retrieve all ${entityName}s: ${error.message}`),
    );
};

/**
 * Fetches a single entity by its ID from a repository and maps it to a DTO schema.
 * @param {object} repository - The repository instance with a `findById` method.
 * @param {string} id - The ID of the entity to fetch.
 * @param {object} dtoSchema - The Zod schema for parsing the response DTO.
 * @param {object} logger - The logger instance.
 * @param {string} entityName - The name of the entity for logging purposes (e.g., 'game', 'player').
 * @param {Error} notFoundError - The specific error to throw if the entity is not found.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the DTO or an error.
 */
export const fetchByIdAndMapToDto = (
  repository,
  id,
  dtoSchema,
  logger,
  entityName,
  notFoundError,
) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      logger.info(`Attempting to retrieve ${entityName} by ID: ${id}`);
      const entity = await repository.findById(id);
      if (!entity) {
        throw notFoundError;
      }
      return entity;
    }),
  )
    .tap((entity) =>
      logger.info(`${entityName} with ID ${entity._id} retrieved successfully.`),
    )
    .map((entity) => dtoSchema.parse(entity))
    .tapError((error) => {
      if (error.constructor === notFoundError.constructor) {
        logger.warn(`${entityName} with ID ${id} not found.`);
      } else {
        logger.error(
          `Failed to retrieve ${entityName} by ID ${id}: ${error.message}`,
        );
      }
    });
};

/**
 * Updates a single entity by its ID and maps the result to a DTO schema.
 * @param {object} repository - The repository instance with an `update` method.
 * @param {string} id - The ID of the entity to update.
 * @param {object} updateData - The data for the update.
 * @param {object} inputDtoSchema - The Zod schema for parsing/validating the input data.
 * @param {object} outputDtoSchema - The Zod schema for parsing the response DTO.
 * @param {object} logger - The logger instance.
 * @param {string} entityName - The name of the entity for logging purposes.
 * @param {Error} notFoundError - The specific error to throw if the entity is not found during update.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the DTO or an error.
 */
export const updateAndMapToDto = (
  repository,
  id,
  updateData,
  inputDtoSchema,
  outputDtoSchema,
  logger,
  entityName,
  notFoundError,
) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      logger.info(`Attempting to update ${entityName} with ID: ${id}`);
      const validatedData = inputDtoSchema.parse(updateData);
      const updatedEntity = await repository.update(id, validatedData);
      if (!updatedEntity) {
        throw notFoundError;
      }
      return updatedEntity;
    }),
  )
    .tap((entity) =>
      logger.info(`${entityName} with ID ${entity._id} updated successfully.`),
    )
    .map((entity) => outputDtoSchema.parse(entity))
    .tapError((error) => {
      if (error.constructor === notFoundError.constructor) {
        logger.warn(`${entityName} with ID ${id} not found for update.`);
      } else {
        logger.error(
          `Failed to update ${entityName} with ID ${id}: ${error.message}`,
        );
      }
    });
};

/**
 * Fetches an entity by ID, deletes it, and returns the deleted entity.
 * @param {object} repository - The repository instance with `findById` and `delete` methods.
 * @param {string} id - The ID of the entity to delete.
 * @param {object} logger - The logger instance.
 * @param {string} entityName - The name of the entity for logging purposes.
 * @param {Error} notFoundError - The specific error to throw if the entity is not found.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the deleted entity or an error.
 */
export const deleteByIdAndReturn = (
  repository,
  id,
  logger,
  entityName,
  notFoundError,
) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      logger.info(`Attempting to delete ${entityName} with ID: ${id}`);
      const entity = await repository.findById(id);
      if (!entity) {
        throw notFoundError;
      }
      await repository.delete(id);
      return entity; // Return the entity that was deleted
    }),
  )
    .tap((entity) =>
      logger.info(`${entityName} with ID ${entity._id} deleted successfully.`),
    )
    .tapError((error) => {
      if (error.constructor === notFoundError.constructor) {
        logger.warn(`${entityName} with ID ${id} not found for deletion.`);
      } else {
        logger.error(
          `Failed to delete ${entityName} with ID ${id}: ${error.message}`,
        );
      }
    });
};

/**
 * Fetches a single entity by its ID from a repository.
 * @param {object} repository - The repository instance with a `findById` method.
 * @param {string} id - The ID of the entity to fetch.
 * @param {object} logger - The logger instance.
 * @param {string} entityName - The name of the entity for logging purposes.
 * @param {Error} notFoundError - The specific error to throw if the entity is not found.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the entity or an error.
 */
export const fetchById = (repository, id, logger, entityName, notFoundError) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      logger.info(`Attempting to retrieve ${entityName} by ID: ${id}`);
      const entity = await repository.findById(id);
      if (!entity) {
        throw notFoundError;
      }
      return entity;
    }),
  );
};

/**
 * Saves an entity to the repository and returns a custom success response.
 * @param {object} repository - The repository instance with a `save` method.
 * @param {object} entity - The entity to save.
 * @param {function(object): object} successResponseBuilder - A function that takes the saved entity and returns the desired success response object.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the custom success response or an error.
 */
export const saveEntityAndReturnCustomResponse = (
  repository,
  entity,
  successResponseBuilder,
) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      await repository.save(entity);
      return Result.success(successResponseBuilder(entity));
    }),
  );
};

/**
 * Saves an entity and then maps it to a DTO.
 * @param {object} repository - The repository with a `save` method.
 * @param {object} entity - The entity to save.
 * @param {object} dtoSchema - The Zod schema for parsing the response DTO.
 * @param {object} logger - The logger instance.
 * @param {string} logMessage - A message to log upon successful save.
 * @returns {ResultAsync<object, Error>} A ResultAsync containing the DTO.
 */
export const saveAndMapToDto = (
  repository,
  entity,
  dtoSchema,
  logger,
  logMessage,
) => {
  return new ResultAsync(
    Result.fromAsync(async () => {
      await repository.save(entity);
      if (logger && logMessage) {
        logger.info(logMessage);
      }
      return dtoSchema.parse(entity);
    }),
  );
};
