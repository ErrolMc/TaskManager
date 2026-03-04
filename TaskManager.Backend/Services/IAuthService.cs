using TaskManager.Backend.Models;

namespace TaskManager.Backend.Services
{
    public interface IAuthService
    {
        string GenerateJwtToken(User user);
        string HashPassword(string password);
        bool ValidatePassword(string password, string hashedPassword);
    }
}
