import React, { useEffect, useRef, useState } from "react";
import { Logo, GoogleIcon, ChevronIcon, CheckIcon, LangButton } from "./ui/Shared.jsx";
import "./AuthScreens.css";

function AuthTitle({ title, accent = "", centered = false, compact = false }) {
  return (
    <h1 className={`${centered ? "text-center" : ""} ${compact ? "text-[33px] xl:text-[42px] min-[1400px]:text-[48px]" : "text-[37px] sm:text-[40px] xl:text-[50px] min-[1400px]:text-[64px]"} font-extrabold leading-[0.95] tracking-normal text-joyBlue`}>
      {title}
      {accent ? <span className="text-joyOrange">{accent}</span> : null}
    </h1>
  );
}

function AuthSubtitle({ children, centered = false }) {
  return (
    <p className={`${centered ? "mx-auto text-center" : ""} mt-2 max-w-[290px] text-[12px] font-medium leading-[1.35] text-joyBlue xl:mt-3 xl:max-w-[420px] xl:text-[15px] xl:leading-[1.34] min-[1400px]:mt-4 min-[1400px]:max-w-[450px] min-[1400px]:text-[18px] min-[1400px]:leading-[1.4]`}>
      {children}
    </p>
  );
}

function TextInput({ placeholder, type = "text", autoComplete, value, onChange }) {
  return <input className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder={placeholder} type={type} autoComplete={autoComplete} value={value} onChange={onChange} />;
}

function PrimaryButton({ children, type = "button", onClick }) {
  return (
    <button type={type} onClick={onClick} className="mt-2 h-[39px] w-full rounded-full bg-joyOrange text-[15px] font-extrabold text-white shadow-[0_15px_32px_rgba(228,102,48,0.25)] transition hover:-translate-y-0.5 hover:bg-[#d75d29] focus:outline-none focus:ring-4 focus:ring-joyOrange/25 xl:mt-3 xl:h-[48px] xl:text-[19px] min-[1400px]:h-[64px] min-[1400px]:text-[24px]">
      {children}
    </button>
  );
}

function GoogleButton() {
  return (
    <button type="button" className="flex h-[39px] w-full items-center justify-center gap-3 rounded-[10px] border border-joyBlue/15 bg-white/40 text-[12px] font-semibold text-joyBlue transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-joyBlue/10 xl:h-[48px] xl:gap-4 xl:rounded-[14px] xl:text-[16px] min-[1400px]:h-[64px] min-[1400px]:text-[22px]">
      Google orqali kirish
      <GoogleIcon />
    </button>
  );
}

function Divider({ label = "yoki" }) {
  return (
    <div className="auth-motion-item my-2 flex items-center gap-3 px-[88px] text-[10px] font-extrabold text-joyDeep xl:my-3 xl:px-[120px] xl:text-[11px] min-[1400px]:my-3 min-[1400px]:px-[130px] min-[1400px]:text-[14px]">
      <span className="h-px flex-1 bg-joyBlue/13" />
      {label}
      <span className="h-px flex-1 bg-joyBlue/13" />
    </div>
  );
}

function AuthColumn({ children, narrow = false }) {
  return (
    <div className="flex min-h-[inherit] flex-col px-7 pb-10 pt-8 sm:px-9 md:px-10 xl:px-12 xl:pb-9 xl:pt-8 min-[1400px]:px-16 min-[1400px]:pb-14 min-[1400px]:pt-12">
      <header className="relative z-50 flex items-center justify-between">
        <Logo />
        <LangButton />
      </header>
      <main className={`mx-auto mt-8 flex w-full flex-1 flex-col justify-center xl:mt-8 ${narrow ? "max-w-[300px] xl:max-w-[390px] min-[1400px]:max-w-[430px]" : "max-w-[310px] xl:max-w-[450px] min-[1400px]:max-w-[480px]"} min-[1400px]:mt-8`}>
        {children}
      </main>
    </div>
  );
}

export function AuthForm({ onSuccess }) {
  const [step, setStep] = useState("phone"); // "phone" | "otp" | "profile"
  const [phone, setPhone] = useState("+998 ");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tokens, setTokens] = useState(null);

  const formatPhone = (val) => {
    if (!val) return "+";
    let raw = val.replace(/[^\d+]/g, "");
    if (!raw.startsWith("+")) raw = "+" + raw.replace(/\+/g, "");
    const digitsOnly = raw.replace(/\D/g, "");

    if (digitsOnly.length === 0) return "+";

    if (digitsOnly.startsWith("998")) {
      const rest = digitsOnly.slice(3);
      let formatted = "+998";
      if (rest.length > 0) formatted += " " + rest.substring(0, 2);
      if (rest.length > 2) formatted += " " + rest.substring(2, 5);
      if (rest.length > 5) formatted += " " + rest.substring(5, 7);
      if (rest.length > 7) formatted += " " + rest.substring(7, 9);
      return formatted;
    }
    
    if (digitsOnly.startsWith("7")) {
      const rest = digitsOnly.slice(1);
      let formatted = "+7";
      if (rest.length > 0) formatted += " " + rest.substring(0, 3);
      if (rest.length > 3) formatted += " " + rest.substring(3, 6);
      if (rest.length > 6) formatted += " " + rest.substring(6, 8);
      if (rest.length > 8) formatted += " " + rest.substring(8, 10);
      return formatted;
    }

    let formatted = "+" + digitsOnly.substring(0, Math.min(3, digitsOnly.length));
    if (digitsOnly.length > 3) {
      let groups = digitsOnly.substring(3).match(/.{1,3}/g);
      if (groups) formatted += " " + groups.join(" ");
    }
    return formatted;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, "");
    if (cleanPhone.length < 11) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/send-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: cleanPhone })
      });
      if (!res.ok) throw new Error("Xato");
      setStep("otp");
    } catch (err) {
      alert("Xatolik yuz berdi!");
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`auth-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`auth-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);
    const focusIndex = Math.min(pasteData.length, 5);
    const targetInput = document.getElementById(`auth-otp-${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    const cleanPhone = phone.replace(/\s+/g, "");
    if (otpString.length !== 6) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/verify-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: cleanPhone, otp_code: otpString })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Xato");
      
      localStorage.setItem("joyzone-access", data.access);
      localStorage.setItem("joyzone-refresh", data.refresh);
      
      if (data.is_new_user) {
        setTokens({ access: data.access, refresh: data.refresh });
        setStep("profile");
      } else {
        onSuccess(data.profile);
      }
    } catch (err) {
      alert("Noto'g'ri kod yoki muddat o'tgan!");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/profile/", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokens.access}`
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName })
      });
      const data = await res.json();
      onSuccess(data);
    } catch (err) {
      alert("Xatolik yuz berdi!");
    }
  };

  if (step === "profile") {
    return (
      <AuthColumn narrow>
        <div className="mb-4 xl:mb-5 min-[1400px]:mb-5">
          <AuthTitle title="Ism " accent="familiya" compact />
          <AuthSubtitle>Joyzone xizmatlaridan foydalanish uchun profilingizni to'ldiring.</AuthSubtitle>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-2 xl:space-y-3 min-[1400px]:space-y-3">
          <TextInput placeholder="Ismingiz" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <TextInput placeholder="Familiyangiz" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <PrimaryButton type="submit">Yakunlash</PrimaryButton>
        </form>
      </AuthColumn>
    );
  }

  if (step === "otp") {
    return (
      <AuthColumn narrow>
        <div className="mb-4 xl:mb-5 min-[1400px]:mb-5">
          <AuthTitle title="Kodni " accent="kiriting" compact />
          <AuthSubtitle>Telegram botimizga yuborilgan 6 xonali tasdiqlash kodini kiriting.</AuthSubtitle>
        </div>
        <form onSubmit={handleOtpSubmit} className="space-y-5 xl:space-y-6 min-[1400px]:space-y-8">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`auth-otp-${index}`}
                className="otp-field"
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                required
              />
            ))}
          </div>
          <PrimaryButton type="submit">Tasdiqlash</PrimaryButton>
        </form>
      </AuthColumn>
    );
  }

  return (
    <AuthColumn narrow>
      <div className="mb-4 xl:mb-5 min-[1400px]:mb-5">
        <AuthTitle title="Hush " accent="kelibsiz!" compact />
        <AuthSubtitle>Telefon raqamingiz orqali tizimga kiring yoki ro'yxatdan o'ting.</AuthSubtitle>
      </div>
      <form onSubmit={handlePhoneSubmit} className="space-y-2 xl:space-y-3 min-[1400px]:space-y-3">
        <TextInput
          placeholder="+998 90 123 45 67"
          autoComplete="tel"
          value={phone}
          onChange={handlePhoneChange}
          required
        />
        <Divider />
        <GoogleButton />
        <PrimaryButton type="submit">Kodni Olish</PrimaryButton>
      </form>
    </AuthColumn>
  );
}

export function LoginForm({ onSuccess }) {
  return <AuthForm onSuccess={onSuccess} />;
}

export function ForgotPasswordForm() {
  return (
    <AuthColumn narrow>
      <div className="mb-5 xl:mb-6 min-[1400px]:mb-7">
        <AuthTitle title="Parolni " accent="tiklash" compact />
        <AuthSubtitle>Hisobingizga ulangan email yoki telefon raqamini kiriting. Parolni tiklash uchun tasdiqlash kodini yuboramiz.</AuthSubtitle>
      </div>
      <form className="space-y-3 xl:space-y-4">
        <TextInput placeholder="Email | Telefon raqami" autoComplete="email" />
        <PrimaryButton type="button" onClick={() => { window.location.hash = "verify"; }}>
          Tiklash kodini yuborish
        </PrimaryButton>
      </form>
      <p className="mt-5 text-center text-[10px] font-bold text-joyDeep xl:mt-5 xl:text-[12px] min-[1400px]:text-[14px]">
        Parolingiz esingizdami? <a href="#login" className="auth-link">Kirish</a>
      </p>
    </AuthColumn>
  );
}

export function VerifyCodeForm() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`verify-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`verify-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);
    const focusIndex = Math.min(pasteData.length, 5);
    const targetInput = document.getElementById(`verify-otp-${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  return (
    <div className="flex min-h-[inherit] flex-col px-7 pb-10 pt-8 sm:px-9 md:px-10 xl:px-12 xl:pb-12 xl:pt-10 min-[1400px]:px-14 min-[1400px]:pt-12">
      <header className="relative z-50 flex items-center justify-between">
        <Logo />
        <LangButton />
      </header>
      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center pb-8 text-center">
        <AuthTitle title="Kodni " accent="tasdiqlang" centered compact />
        <p className="mx-auto mt-3 max-w-[390px] text-center text-[12px] font-medium leading-[1.45] text-joyBlue xl:text-[15px] min-[1400px]:text-[18px]">
          Email yoki telefon raqamingizga yuborilgan 6 xonali tasdiqlash kodini kiriting.
        </p>
        <div className="mt-8 flex justify-center gap-2 sm:gap-3 min-[1400px]:mt-10">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`verify-otp-${index}`}
              className="otp-field"
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onPaste={handleOtpPaste}
              aria-label={`${index + 1}-raqam`}
            />
          ))}
        </div>
        <div className="mt-8 w-full max-w-[430px]">
          <PrimaryButton type="submit">Tasdiqlash</PrimaryButton>
        </div>
        <p className="mt-5 text-center text-[10px] font-bold text-joyDeep xl:mt-5 xl:text-[12px] min-[1400px]:text-[14px]">
          Kod kelmadimi? <a href="#forgot" className="auth-link">Qayta yuborish</a>
        </p>
      </main>
    </div>
  );
}
