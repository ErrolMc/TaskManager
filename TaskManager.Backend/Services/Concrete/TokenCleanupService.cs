using TaskManager.Backend.Repositories;

namespace TaskManager.Backend.Services.Concrete
{
    public class TokenCleanupService : IHostedService, IDisposable
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TokenCleanupService> _logger;
        private Timer? _timer;

        private readonly TimeSpan refreshTime = TimeSpan.FromMinutes(1);

        public TokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<TokenCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _timer = new Timer(DoCleanup, null, TimeSpan.Zero, refreshTime);
            return Task.CompletedTask;
        }

        private async void DoCleanup(object? state)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
                int deletedCount = await refreshTokenRepository.RemoveExpiredTokens();
                _logger.LogDebug("Cleaned up {Count} expired refresh tokens", deletedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error during refresh token cleanup: {Message}", ex.Message);
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
}
