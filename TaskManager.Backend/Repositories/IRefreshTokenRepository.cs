using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IRefreshTokenRepository
    {
        public Task<(RefreshToken? data, RefreshTokenValidateState state)> ValidateRefreshToken(string token);
        public Task<bool> RemoveRefreshToken(string token);
        public Task<string> CreateRefreshToken(string userID);
        public Task<string> RotateRefreshToken(RefreshToken data);
        public Task<int> RemoveExpiredTokens();
    }
}
