using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using HypixelidleBackEnd.Models;
using System.Security.Cryptography;
using HypixelidleBackEnd.Controllers;

namespace HypixelidleBackEnd.Services
{
    public class HashingService
    {
        private readonly HypixelIdleContext _context;

        public HashingService(HypixelIdleContext context)
        {
            _context = context;
        }

        public string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(bytes);
            }
        }
    }
}