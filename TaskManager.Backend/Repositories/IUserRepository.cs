using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IUserRepository
    {
        public Task<User?> GetUserByIdAsync(string id);
        public Task<User?> GetUserByUsernameAsync(string username);
        public Task<bool> CreateUserAsync(User user);
    }
}
