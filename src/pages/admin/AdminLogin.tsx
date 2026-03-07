import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import bdVoteLogo from "@/assets/bd-vote-logo.png"; // logo import

export default function AdminLogin() {
  const [role, setRole] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const DEMO_MODE = true;

  const handleLogin = () => {
    if (!email || !password) {
      alert("Email & password দিন");
      return;
    }

    if (DEMO_MODE) {
      alert(${role} হিসেবে লগইন সফল);
      switch (role) {
        case "Admin":
          navigate("/admin");
          break;
        case "Law Enforcement":
          navigate("/law");
          break;
        case "Technician":
          navigate("/tech");
          break;
        case "Candidate":
          navigate("/candidate");
          break;
      }
      return;
    }

    // এখানে database + verification integration হবে
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-6 space-y-6">
        
        {/* Logo */}
        <div className="flex justify-center">
          <img src={bdVoteLogo} alt="BD Vote" className="h-16 w-auto" />
        </div>

        <h2 className="text-2xl font-bold text-center">লগইন করুন</h2>

        {/* Role select */}
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
          >
            <option value="Admin">Admin</option>
            <option value="Law Enforcement">Law Enforcement</option>
            <option value="Technician">Technician</option>
            <option value="Candidate">Candidate</option>
          </select>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Login button */}
        <Button className="w-full mt-2" onClick={handleLogin}>
          লগইন
        </Button>
      </div>
    </div>
  );
}
