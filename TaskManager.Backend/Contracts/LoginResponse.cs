namespace TaskManager.Backend.Contracts
{
    public class LoginResponse
    {
        public string UserID { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }
}
