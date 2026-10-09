"use client";

import { useState } from "react";
import { Fingerprint, CheckCircle2, ShieldCheck, Loader2, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fromBase64Url, toBase64Url } from "@/lib/auth/webauthn";

export function BiometricManager() {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { toast } = useToast();

  async function registerFingerprint() {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast({
        title: "বায়োমেট্রিক সমর্থিত নয়",
        description: "আপনার ব্রাউজার বা ডিভাইসে ফিঙ্গারপ্রিন্ট বা Passkey হার্ডওয়্যার নেই।",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1) Get challenge & creation options
      const optRes = await fetch("/api/auth/webauthn/register");
      const optJson = await optRes.json();
      if (!optRes.ok || !optJson.ok) {
        toast({ title: optJson.error ?? "প্রস্তুতি ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }

      const { challenge, rp, user, pubKeyCredParams, authenticatorSelection, timeout } = optJson;

      const challengeBytes = fromBase64Url(challenge);
      const userIdBytes = new TextEncoder().encode(user.id);

      // 2) Trigger browser native biometric registration prompt
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes as unknown as BufferSource,
          rp: {
            name: rp.name,
            id: rp.id || window.location.hostname,
          },
          user: {
            id: userIdBytes as unknown as BufferSource,
            name: user.name,
            displayName: user.displayName,
          },
          pubKeyCredParams: pubKeyCredParams || [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: authenticatorSelection || {
            authenticatorAttachment: "platform",
            userVerification: "preferred",
          },
          timeout: timeout || 60000,
          attestation: "none",
        },
      })) as (PublicKeyCredential & { rawId: ArrayBuffer; response: AuthenticatorAttestationResponse }) | null;

      if (!credential) {
        toast({ title: "ফিঙ্গারপ্রিন্ট সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      const rawId = toBase64Url(new Uint8Array(credential.rawId));
      const clientDataJSON = new TextDecoder().decode(credential.response.clientDataJSON);

      // The server parses the attestationObject (CBOR) to extract the real
      // COSE public key — we never send an opaque "publicKey" blob.
      const attestationObject = toBase64Url(new Uint8Array(credential.response.attestationObject));

      // 3) Send credential to server
      const saveRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: rawId,
          attestationObject,
          rawClientData: clientDataJSON,
          deviceName: navigator.userAgent.includes("Mobile") ? "স্মার্টফোন ফিঙ্গারপ্রিন্ট" : "ল্যাপটপ / পিসি বায়োমেট্রিক",
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.ok) {
        toast({ title: saveJson.error ?? "ফিঙ্গারপ্রিন্ট সেভ করা যায়নি।", variant: "destructive" });
        return;
      }

      setRegistered(true);
      toast({
        title: "ফিঙ্গারপ্রিন্ট সফলভাবে যুক্ত হয়েছে! 🎉",
        description: "এখন থেকে লগইন পেজে আপনি শুধু ফিঙ্গারপ্রিন্ট স্পর্শ করেই লগইন করতে পারবেন।",
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast({ title: "ফিঙ্গারপ্রিন্ট অনুরোধ বাতিল করা হয়েছে।", variant: "destructive" });
      } else {
        toast({ title: "বায়োমেট্রিক যুক্ত করা যায়নি। আবার চেষ্টা করুন।", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Fingerprint className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-slate-800">বায়োমেট্রিক ও ফিঙ্গারপ্রিন্ট লগইন</h3>
          <p className="text-[12px] text-muted-foreground">
            আপনার ফোন বা ল্যাপটপের ফিঙ্গারপ্রিন্ট সেন্সর দিয়ে পাসওয়ার্ড ছাড়াই দ্রুত লগইন করুন।
          </p>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>FIDO2 / WebAuthn আন্তর্জাতিকভাবে স্বীকৃত সর্বোচ্চ এনক্রিপ্টেড নিরাপত্তা</span>
        </div>

        <Button
          type="button"
          onClick={registerFingerprint}
          disabled={loading}
          className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : registered ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Fingerprint className="h-4 w-4" />
          )}
          <span>{registered ? "নতুন ফিঙ্গারপ্রিন্ট যুক্ত হয়েছে" : "ফিঙ্গারপ্রিন্ট / বায়োমেট্রিক যুক্ত করুন"}</span>
        </Button>
      </div>
    </div>
  );
}
