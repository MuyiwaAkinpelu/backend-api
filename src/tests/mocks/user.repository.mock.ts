const mockUserRepository = {
  findAllPaginated: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
};

export default mockUserRepository;
