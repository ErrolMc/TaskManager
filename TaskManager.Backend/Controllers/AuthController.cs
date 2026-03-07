using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Backend.Contracts.Auth;
using TaskManager.Backend.Models;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;
using LoginRequest = TaskManager.Backend.Contracts.Auth.LoginRequest;

namespace TaskManager.Backend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ILogger<AuthController> _logger;
        private readonly IAuthService _authService;
        private readonly IUserRepository _userRepository;
        private readonly IRefreshTokenRepository _refreshTokenRepository;

        public AuthController(
            ILogger<AuthController> logger,
            IAuthService authService,
            IUserRepository userRepository,
            IRefreshTokenRepository refreshTokenRepository)
        {
            _logger = logger;
            _authService = authService;
            _userRepository = userRepository;
            _refreshTokenRepository = refreshTokenRepository;
        }

        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Register([FromBody] LoginRequest request)
        {
            var existingUser = await _userRepository.GetUserByUsernameAsync(request.Username);
            if (existingUser != null)
                return Conflict("Username already exists");

            var user = new User
            {
                UserID = Guid.NewGuid().ToString(),
                Username = request.Username,
                PasswordHash = _authService.HashPassword(request.Password)
            };

            bool created = await _userRepository.CreateUserAsync(user);
            if (!created)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create user");

            return Ok("Successfully created user");
        }

        [HttpPost("login")]
        [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<LoginResponse>(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userRepository.GetUserByUsernameAsync(request.Username);
            if (user == null)
                return Unauthorized("Invalid credentials");

            bool result = _authService.ValidatePassword(request.Password, user.PasswordHash);
            if (result == false)
                return Unauthorized("Invalid credentials");

            string accessToken = _authService.GenerateJwtToken(user);
            string refreshToken = await _refreshTokenRepository.CreateRefreshToken(user.UserID);

            return Ok(new LoginResponse() { UserID = user.UserID, Token = accessToken, RefreshToken = refreshToken });
        }

        [HttpPost("refresh")]
        [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<LoginResponse>(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        {
            var (tokenData, state) = await _refreshTokenRepository.ValidateRefreshToken(request.RefreshToken);

            if (state != RefreshTokenValidateState.Success || tokenData == null)
                return Unauthorized("Invalid refresh token");

            User? user = await _userRepository.GetUserByIdAsync(tokenData.UserID);
            if (user == null)
                return Unauthorized("User not found");

            string newAccessToken = _authService.GenerateJwtToken(user);
            string newRefreshToken = await _refreshTokenRepository.RotateRefreshToken(tokenData);

            return Ok(new LoginResponse { UserID = user.UserID, Token = newAccessToken, RefreshToken = newRefreshToken });
        }
    }
}
