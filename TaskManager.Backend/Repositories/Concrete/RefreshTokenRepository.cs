using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;
using TaskManager.Backend.Source;

namespace TaskManager.Backend.Repositories.Concrete
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly AppDbContext _context;

        public RefreshTokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(RefreshToken? data, RefreshTokenValidateState state)> ValidateRefreshToken(string token)
        {
            RefreshToken? refreshToken = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);

            if (refreshToken == null)
                return (null, RefreshTokenValidateState.CantFindToken);

            if (refreshToken.Expiry < DateTime.UtcNow)
                return (refreshToken, RefreshTokenValidateState.TokenExpired);

            return (refreshToken, RefreshTokenValidateState.Success);
        }

        public async Task<bool> RemoveRefreshToken(string token)
        {
            var refreshToken = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);
            if (refreshToken == null) 
                return false;

            _context.RefreshTokens.Remove(refreshToken);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<string> CreateRefreshToken(string userID)
        {
            var token = new RefreshToken
            {
                ID = Guid.NewGuid().ToString(),
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                Expiry = DateTime.UtcNow.AddDays(Constants.REFRESH_TOKEN_EXPIRATION_DAYS),
                UserID = userID,
                Audience = Constants.WEB_APP_URI
            };

            _context.RefreshTokens.Add(token);
            await _context.SaveChangesAsync();
            return token.Token;
        }

        public async Task<string> RotateRefreshToken(RefreshToken data)
        {
            _context.RefreshTokens.Remove(data);

            var newToken = new RefreshToken
            {
                ID = Guid.NewGuid().ToString(),
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                Expiry = DateTime.UtcNow.AddDays(Constants.REFRESH_TOKEN_EXPIRATION_DAYS),
                UserID = data.UserID,
                Audience = data.Audience
            };

            _context.RefreshTokens.Add(newToken);
            await _context.SaveChangesAsync();
            return newToken.Token;
        }

        public async Task<int> RemoveExpiredTokens()
        {
            var expired = await _context.RefreshTokens
                .Where(t => t.Expiry < DateTime.UtcNow)
                .ToListAsync();

            _context.RefreshTokens.RemoveRange(expired);
            return await _context.SaveChangesAsync();
        }
    }
}
