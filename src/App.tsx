import React, { useState, useEffect, useRef } from "react";
import { AppState, Room, BingoCardData, GameMode } from "./types";
import { AdminRooms } from "./components/AdminRooms";
import { PlayerLobby } from "./components/PlayerLobby";
import { PlayerMobileView } from "./components/PlayerMobileView";
import { Dashboard } from "./components/Dashboard";
import { AuthScreen } from "./components/AuthScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { AdminUsers } from "./components/AdminUsers";
import { AdminFinancial } from "./components/AdminFinancial";
import { Toaster, toast } from "react-hot-toast";
import { Moon, Sun, LogOut, Layers, Users, Coins, Eye } from "lucide-react";
import {
  generateBingoCard,
  isCardWinner,
  serializeGrid,
  deserializeGrid,
  getRoomCurrentPrize,
} from "./utils";
import { audioController } from "./audioUtils";

export default function App() {
  const isCreatingAutoRoomRef = useRef(false);
  const [appState, setAppState] = useState<AppState & { showAuth?: boolean }>(
    () => {
      let savedSettings = {
        soundEnabled: true,
        notificationsEnabled: true,
        darkMode: false,
      };
      try {
        const saved = localStorage.getItem("bingo_live_settings");
        if (saved) {
          savedSettings = JSON.parse(saved);
        }
      } catch (e) {
        console.error(e);
      }
      return {
        view: "player_lobby",
        rooms: [],
        currentRoomId: null,
        currentUser: null,
        showAuth: false,
        settings: savedSettings,
      };
    },
  );

  const [adminTab, setAdminTab] = useState<"rooms" | "users" | "financial">(
    "rooms",
  );

  const spectatorCard = React.useMemo(() => {
    return generateBingoCard(
      "SPECTATOR",
      appState.currentUser?.name || "Espectador",
    );
  }, [appState.currentRoomId, appState.currentUser?.uid]);

  useEffect(() => {
    if (appState.settings) {
      try {
        localStorage.setItem(
          "bingo_live_settings",
          JSON.stringify(appState.settings),
        );
      } catch (e) {
        console.warn(
          "localStorage write is blocked in this container/iframe:",
          e,
        );
      }

      const isDark = appState.settings.darkMode;
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [appState.settings]);

  // Restaura sessão do Firebase Auth automaticamente
  useEffect(() => {
    let unsubPromise = (async () => {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { getDoc, doc } = await import("firebase/firestore");
      const { auth, db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            let userSnap;
            try {
              userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            } catch (dbErr) {
              handleFirestoreError(
                dbErr,
                OperationType.GET,
                `users/${firebaseUser.uid}`,
              );
            }
            if (userSnap && userSnap.exists()) {
              const userData = userSnap.data();
              setAppState((prev) => {
                const isLobby = prev.view === "player_lobby" || prev.view === "home";
                return {
                  ...prev,
                  currentUser: { uid: firebaseUser.uid, ...userData } as any,
                  view: isLobby
                    ? userData.role === "admin"
                      ? "admin"
                      : "player_lobby"
                    : prev.view,
                  showAuth: false,
                };
              });
            }
          } catch (err) {
            console.error("Error automatic session retrieve:", err);
          }
        }
      });
    })();

    return () => {
      unsubPromise.then((unsub) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { auth } = await import("./lib/firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setAppState((prev) => ({
      ...prev,
      view: "player_lobby",
      currentUser: null,
      currentRoomId: null,
    }));
    toast.success("Sessão encerrada.");
  };

  const handleUpdateProfilePhoto = async (photoURL: string) => {
    if (!appState.currentUser) return;
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      const userRef = doc(db, "users", appState.currentUser.uid);
      try {
        await updateDoc(userRef, { photoURL });
      } catch (dbErr) {
        handleFirestoreError(
          dbErr,
          OperationType.UPDATE,
          `users/${appState.currentUser.uid}`,
        );
      }

      setAppState((prev) => ({
        ...prev,
        currentUser: prev.currentUser
          ? { ...prev.currentUser, photoURL }
          : null,
      }));
      toast.success("Foto do perfil atualizada com sucesso!");
    } catch (e: any) {
      console.error(e);
      setAppState((prev) => ({
        ...prev,
        currentUser: prev.currentUser
          ? { ...prev.currentUser, photoURL }
          : null,
      }));
      toast.success("Foto atualizada com sucesso localmente.");
    }
  };

  const handleLoginSuccess = (user: any, role: "admin" | "player") => {
    toast.success(`Bem-vindo, ${user.name}!`);
    setAppState((prev) => ({
      ...prev,
      currentUser: user,
      view: role === "admin" ? "admin" : "player_lobby",
      showAuth: false,
    }));
  };

  const handleCreateRoom = async (
    partialRoom: Partial<Room & { botsEnabled?: boolean; maxBots?: number }>,
  ) => {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      const newRoomId = Math.random().toString(36).substring(2, 9);

      const isBotVsBot = partialRoom.gameMode === "bot_vs_bot";
      const finalBotsEnabled = isBotVsBot
        ? true
        : partialRoom.botsEnabled || false;
      const finalMaxBots = isBotVsBot
        ? Math.max(5, partialRoom.maxBots || 5)
        : partialRoom.maxBots || 0;

      const roomPayload = {
        name: partialRoom.name!,
        entryFee: partialRoom.entryFee!,
        prize: partialRoom.prize ?? 100,
        scheduledTime: partialRoom.scheduledTime!,
        maxPlayers: partialRoom.maxPlayers || 10,
        status: "waiting",
        drawnNumbers: [],
        gameMode: partialRoom.gameMode || "full_card",
        bgMusicUrl: partialRoom.bgMusicUrl || null,
        onlineRadioUrl: partialRoom.onlineRadioUrl || null,
        backgroundImageUrl: partialRoom.backgroundImageUrl || null,
        roomIcon: partialRoom.roomIcon || null,
        botsEnabled: finalBotsEnabled,
        maxBots: finalMaxBots,
        isAutoCreated: false,
        theme: partialRoom.theme || "emerald",
        fourBallsStage1Limit: partialRoom.fourBallsStage1Limit || null,
        fourBallsStage2Limit: partialRoom.fourBallsStage2Limit || null,
        fourBallsStage3Limit: partialRoom.fourBallsStage3Limit || null,
      };

      try {
        await setDoc(doc(db, "rooms", newRoomId), roomPayload);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `rooms/${newRoomId}`);
      }

      // Create bots inside subcollection players if bots are enabled
      if (finalBotsEnabled && finalMaxBots && finalMaxBots > 0) {
        const botNames = [
          "Arthur",
          "Daiane",
          "Camila",
          "Sandra",
          "Renato",
          "Lucas",
          "Julia",
          "Marcos",
          "Fernanda",
          "Felipe",
          "Gustavo",
          "Patrícia",
          "Alana",
          "Ricardo",
          "Aline",
        ];
        const shuffled = [...botNames].sort(() => 0.5 - Math.random());
        const count = Math.min(finalMaxBots, shuffled.length);

        for (let i = 0; i < count; i++) {
          const botId = `bot_manual_${Math.random().toString(36).substring(2, 9)}`;
          const botCard = generateBingoCard(botId, shuffled[i]);
          try {
            await setDoc(doc(db, "rooms", newRoomId, "players", botId), {
              name: shuffled[i],
              card: {
                id: botCard.id,
                playerName: botCard.playerName,
                grid: serializeGrid(botCard.grid),
              },
            });
          } catch (dbErr) {
            handleFirestoreError(
              dbErr,
              OperationType.CREATE,
              `rooms/${newRoomId}/players/${botId}`,
            );
          }
        }
      }

      toast.success("Sala criada com sucesso!");
    } catch (e) {
      console.error("Error creating room:", e);
      toast.error("Ocorreu um erro ao criar a sala.");
    }
  };

  const handleJoinRoom = async (roomId: string, card: BingoCardData) => {
    if (!appState.currentUser) return;
    const room = appState.rooms.find((r) => r.id === roomId);
    if (!room) {
      toast.error("Sala não encontrada.");
      return;
    }
    if (appState.currentUser.coins < room.entryFee) {
      toast.error("Saldo insuficiente.");
      return;
    }

    try {
      const { doc, setDoc, updateDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      const userRef = doc(db, "users", appState.currentUser.uid);
      const newCoins = appState.currentUser.coins - room.entryFee;

      // Update coins
      try {
        await updateDoc(userRef, { coins: newCoins });
      } catch (dbErr) {
        handleFirestoreError(
          dbErr,
          OperationType.UPDATE,
          `users/${appState.currentUser.uid}`,
        );
      }

      // Add player to the room in Firestore
      try {
        await setDoc(
          doc(db, "rooms", roomId, "players", appState.currentUser.uid),
          {
            name: appState.currentUser.name,
            card: {
              id: card.id,
              playerName: card.playerName,
              grid: serializeGrid(card.grid),
            },
          },
        );
      } catch (dbErr) {
        handleFirestoreError(
          dbErr,
          OperationType.CREATE,
          `rooms/${roomId}/players/${appState.currentUser.uid}`,
        );
      }

      setAppState((prev) => {
        return {
          ...prev,
          currentUser: prev.currentUser
            ? {
                ...prev.currentUser,
                coins: newCoins,
              }
            : null,
        };
      });

      toast.success("Você entrou na sala! Boa sorte! 🎟️");
    } catch (e) {
      console.error("Error joining room:", e);
      toast.error("Erro ao entrar na sala. Tente novamente.");
    }
  };

  const handleDrawNumberAdmin = async (roomId: string, num: number) => {
    try {
      const { doc, getDoc, updateDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      const roomRef = doc(db, "rooms", roomId);
      let snap;
      try {
        snap = await getDoc(roomRef);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `rooms/${roomId}`);
      }
      if (snap && snap.exists()) {
        const currentDrawn = snap.data().drawnNumbers || [];
        if (!currentDrawn.includes(num)) {
          const nextDrawn = [...currentDrawn, num];
          try {
            await updateDoc(roomRef, { drawnNumbers: nextDrawn });
          } catch (dbErr) {
            handleFirestoreError(
              dbErr,
              OperationType.UPDATE,
              `rooms/${roomId}`,
            );
          }
        }
      }
    } catch (e) {
      console.error("Error drawing number in Firestore:", e);
    }
  };

  const handleResetGameAdmin = async (roomId: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          drawnNumbers: [],
          status: "waiting",
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${roomId}`);
      }
      toast.success("Jogo reiniciado!");
    } catch (e) {
      console.error("Error resetting room in Firestore:", e);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");
      try {
        await deleteDoc(doc(db, "rooms", roomId));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `rooms/${roomId}`);
      }
    } catch (e) {
      console.error("Error deleting room from Firestore:", e);
    }
    setAppState((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }));
    toast.success("Sala excluída.");
  };

  const handleUpdateRoomSettings = async (
    roomId: string,
    name: string,
    botsEnabled: boolean,
    maxBots: number,
    backgroundImageUrl?: string,
    roomIcon?: string,
    theme?: string,
  ) => {
    try {
      const { doc, getDocs, setDoc, deleteDoc, updateDoc, collection } =
        await import("firebase/firestore");
      const { db, handleFirestoreError, OperationType } =
        await import("./lib/firebase");

      // 1. Atualizar documento principal de sala
      const roomRef = doc(db, "rooms", roomId);
      try {
        await updateDoc(roomRef, {
          name,
          botsEnabled,
          maxBots: botsEnabled ? maxBots : 0,
          backgroundImageUrl: backgroundImageUrl || null,
          roomIcon: roomIcon || null,
          theme: theme || "emerald",
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${roomId}`);
      }

      // 2. Ajustar quantidade e dados de bots na subcoleção de jogadores da sala
      const playersCol = collection(db, "rooms", roomId, "players");
      let playersSnap;
      try {
        playersSnap = await getDocs(playersCol);
      } catch (dbErr) {
        handleFirestoreError(
          dbErr,
          OperationType.GET,
          `rooms/${roomId}/players`,
        );
      }

      const botPlayersList: Array<{ id: string; name: string }> = [];
      if (playersSnap) {
        playersSnap.forEach((pDoc) => {
          if (pDoc.id.startsWith("bot_")) {
            botPlayersList.push({ id: pDoc.id, name: pDoc.data().name });
          }
        });
      }

      if (!botsEnabled || maxBots <= 0) {
        // Remover todos os bots da subcoleção se desativados
        for (const bot of botPlayersList) {
          try {
            await deleteDoc(doc(db, "rooms", roomId, "players", bot.id));
          } catch (dbErr) {
            handleFirestoreError(
              dbErr,
              OperationType.DELETE,
              `rooms/${roomId}/players/${bot.id}`,
            );
          }
        }
      } else {
        const currentCount = botPlayersList.length;
        if (currentCount < maxBots) {
          // Acrescentar novos bots necessários
          const botNames = [
            "Arthur",
            "Daiane",
            "Camila",
            "Sandra",
            "Renato",
            "Lucas",
            "Julia",
            "Marcos",
            "Fernanda",
            "Felipe",
            "Gustavo",
            "Marina",
          ];
          const existingNames = botPlayersList.map((b) => b.name);
          const availableNames = botNames.filter(
            (n) => !existingNames.includes(n),
          );

          const needToAdd = maxBots - currentCount;
          for (let i = 0; i < needToAdd; i++) {
            const nameToUse =
              availableNames[i % availableNames.length] ||
              `Jogador Extra ${Math.floor(Math.random() * 1000)}`;
            const botId = `bot_${Math.random().toString(36).substring(2, 9)}`;
            const botCard = generateBingoCard(botId, nameToUse);

            try {
              await setDoc(doc(db, "rooms", roomId, "players", botId), {
                name: nameToUse,
                card: {
                  id: botCard.id,
                  playerName: botCard.playerName,
                  grid: serializeGrid(botCard.grid),
                },
              });
            } catch (dbErr) {
              handleFirestoreError(
                dbErr,
                OperationType.CREATE,
                `rooms/${roomId}/players/${botId}`,
              );
            }
          }
        } else if (currentCount > maxBots) {
          // Remover bots excessivos se reduzido
          const diff = currentCount - maxBots;
          for (let i = 0; i < diff; i++) {
            try {
              await deleteDoc(
                doc(db, "rooms", roomId, "players", botPlayersList[i].id),
              );
            } catch (dbErr) {
              handleFirestoreError(
                dbErr,
                OperationType.DELETE,
                `rooms/${roomId}/players/${botPlayersList[i].id}`,
              );
            }
          }
        }
      }

      toast.success("Configurações da sala e de bots atualizadas com sucesso!");
    } catch (e) {
      console.error("Error updating room settings:", e);
      toast.error("Erro ao atualizar configurações da sala.");
    }
  };

  const handleSendMessage = async (roomId: string, text: string) => {
    if (!appState.currentUser) return;
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      const messageId = `msg_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, "rooms", roomId, "messages", messageId), {
        senderId: appState.currentUser.uid,
        senderName: appState.currentUser.name,
        text,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error("Error sending user chat message to Firestore:", e);
    }
  };

  const [isAdminAutoDraw, setIsAdminAutoDraw] = useState(false);
  const [isAdminSpeechEnabled, setIsAdminSpeechEnabled] = useState(true);
  const [adminVoiceGender, setAdminVoiceGender] = useState<"female" | "male">(
    "female",
  );

  // 🤖 Criação Automática de Salas & Bots Real-time Sync
  const [autoRoomEnabled, setAutoRoomEnabled] = useState(false);
  const [autoRoomInterval, setAutoRoomInterval] = useState(5);
  const [autoRoomStartHour, setAutoRoomStartHour] = useState("00:00");
  const [autoRoomEndHour, setAutoRoomEndHour] = useState("23:59");
  const [autoRoomRadioUrl, setAutoRoomRadioUrl] = useState("");
  const [autoRoomBotsCount, setAutoRoomBotsCount] = useState(2);
  const [autoRoomBaseName, setAutoRoomBaseName] = useState("Sala do Milhão");
  const [autoRoomSequenceNumber, setAutoRoomSequenceNumber] = useState(1);
  const [autoRoomGameMode, setAutoRoomGameMode] =
    useState<GameMode>("full_card");
  const [autoRoomQuantity, setAutoRoomQuantity] = useState(1);
  const [autoRoomEntryFee, setAutoRoomEntryFee] = useState<number>(10);
  const [autoRoomPrizeMode, setAutoRoomPrizeMode] = useState<
    "fixed" | "cumulative" | "cumulative_jackpot"
  >("fixed");
  const [autoRoomPrizeValue, setAutoRoomPrizeValue] = useState<number>(100);
  const [processedRooms, setProcessedRooms] = useState<Set<string>>(new Set());
  const [scheduledDeletions, setScheduledDeletions] = useState<Set<string>>(
    new Set(),
  );

  // Sincronizar Configuração Global via Firestore
  useEffect(() => {
    let unsub: () => void = () => {};
    const initAutomationSync = async () => {
      try {
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { db, handleFirestoreError, OperationType } =
          await import("./lib/firebase");

        unsub = onSnapshot(
          doc(db, "settings", "global_automation"),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setAutoRoomEnabled(data.enabled ?? false);
              setAutoRoomInterval(data.intervalMinutes ?? 5);
              setAutoRoomStartHour(data.startHour ?? "00:00");
              setAutoRoomEndHour(data.endHour ?? "23:59");
              setAutoRoomRadioUrl(data.radioUrl ?? "");
              setAutoRoomBotsCount(data.botsCount ?? 2);
              setAutoRoomBaseName(data.roomBaseName ?? "Sala do Milhão");
              setAutoRoomSequenceNumber(data.roomSequenceNumber ?? 1);
              setAutoRoomGameMode((data.gameMode as GameMode) ?? "full_card");
              setAutoRoomQuantity(data.quantity ?? 1);
              setAutoRoomEntryFee(data.entryFee ?? 10);
              setAutoRoomPrizeMode(data.prizeMode ?? "fixed");
              setAutoRoomPrizeValue(data.prizeValue ?? 100);
            }
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              "settings/global_automation",
              false,
            );
          },
        );
      } catch (err) {
        console.warn("Firestore settings: using local state fallback.");
      }
    };
    initAutomationSync();
    return () => unsub();
  }, [appState.currentUser]);

  const handleToggleAutoRoomEnabled = async () => {
    const newVal = !autoRoomEnabled;
    setAutoRoomEnabled(newVal);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          enabled: newVal,
          intervalMinutes: autoRoomInterval,
          startHour: autoRoomStartHour,
          endHour: autoRoomEndHour,
          radioUrl: autoRoomRadioUrl,
        },
        { merge: true },
      );
      toast.success(
        newVal
          ? "Criação automática ativada!"
          : "Criação automática desativada!",
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomBotsCount = async (val: number) => {
    setAutoRoomBotsCount(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          botsCount: val,
        },
        { merge: true },
      );
      toast.success(`Quantidade de bots atualizada para ${val}!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomBaseName = async (val: string) => {
    setAutoRoomBaseName(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          roomBaseName: val,
        },
        { merge: true },
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomSequenceNumber = async (val: number) => {
    setAutoRoomSequenceNumber(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          roomSequenceNumber: val,
        },
        { merge: true },
      );
      toast.success(`Sequencial atualizado para ${val}!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomGameMode = async (val: GameMode) => {
    setAutoRoomGameMode(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          gameMode: val,
        },
        { merge: true },
      );
      toast.success(`Modo de jogo automático e bots atualizado!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomQuantity = async (val: number) => {
    setAutoRoomQuantity(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          quantity: val,
        },
        { merge: true },
      );
      toast.success(`Quantidade de salas por vez atualizada para ${val}!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomEntryFee = async (val: number) => {
    setAutoRoomEntryFee(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          entryFee: val,
        },
        { merge: true },
      );
      toast.success(`Custo da cartela atualizado para ${val} moedas!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomPrizeMode = async (
    val: "fixed" | "cumulative" | "cumulative_jackpot",
  ) => {
    setAutoRoomPrizeMode(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          prizeMode: val,
        },
        { merge: true },
      );
      toast.success(`Tipo de premiação atualizado!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomPrizeValue = async (val: number) => {
    setAutoRoomPrizeValue(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          prizeValue: val,
        },
        { merge: true },
      );
      toast.success(`Valor do prêmio fixo atualizado para ${val} moedas!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomInterval = async (val: number) => {
    setAutoRoomInterval(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          enabled: autoRoomEnabled,
          intervalMinutes: val,
          startHour: autoRoomStartHour,
          endHour: autoRoomEndHour,
          radioUrl: autoRoomRadioUrl,
        },
        { merge: true },
      );
      toast.success(`Intervalo atualizado para ${val} min!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomHours = async (start: string, end: string) => {
    setAutoRoomStartHour(start);
    setAutoRoomEndHour(end);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          enabled: autoRoomEnabled,
          intervalMinutes: autoRoomInterval,
          startHour: start,
          endHour: end,
          radioUrl: autoRoomRadioUrl,
        },
        { merge: true },
      );
      toast.success(
        `Funcionamento automático configurado das ${start} às ${end}!`,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomRadioUrl = async (val: string) => {
    setAutoRoomRadioUrl(val);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          enabled: autoRoomEnabled,
          intervalMinutes: autoRoomInterval,
          startHour: autoRoomStartHour,
          endHour: autoRoomEndHour,
          radioUrl: val,
        },
        { merge: true },
      );
      toast.success(
        val
          ? "Preset de rádio configurado para salas automáticas!"
          : "Configuração de rádio automática limpa.",
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Criação automática de salas: se ativado, agenda uma nova se não houver nenhuma agendada
  const triggerAutoRoomCreation = async () => {
    if (!appState.currentUser) return;
    if (isCreatingAutoRoomRef.current) return;
    try {
      isCreatingAutoRoomRef.current = true;
      const { doc, setDoc, getDoc } = await import("firebase/firestore");
      const { db } = await import("./lib/firebase");

      // Sync and retrieve latest parameters from Firebase settings doc
      const sfDoc = await getDoc(doc(db, "settings", "global_automation"));
      let currentSeq = autoRoomSequenceNumber;
      let namePattern = autoRoomBaseName;
      let botsCount = autoRoomBotsCount;
      let gMode: GameMode = autoRoomGameMode;
      let quantityToCreate = autoRoomQuantity;
      let entryFee = autoRoomEntryFee;
      let pMode = autoRoomPrizeMode;
      let pValue = autoRoomPrizeValue;
      if (sfDoc.exists()) {
        const d = sfDoc.data();
        currentSeq = d.roomSequenceNumber ?? currentSeq;
        namePattern = d.roomBaseName ?? namePattern;
        botsCount = d.botsCount ?? botsCount;
        gMode = (d.gameMode as GameMode) ?? gMode;
        quantityToCreate = d.quantity ?? quantityToCreate;
        entryFee = d.entryFee ?? entryFee;
        pMode = d.prizeMode ?? pMode;
        pValue = d.prizeValue ?? pValue;
      }

      for (let k = 0; k < quantityToCreate; k++) {
        const nextSeq = currentSeq + k;
        const newRoomId = "auto_" + Math.random().toString(36).substring(2, 9);
        const scheduledTime =
          Date.now() + autoRoomInterval * 60 * 1000 + k * 1000; // 1s diff offset

        const paddedSeq = nextSeq.toString().padStart(2, "0");
        const roomPayload = {
          name: `${namePattern} ${paddedSeq}`,
          entryFee: entryFee,
          prize: pMode === "fixed" ? pValue : 0,
          prizeMode: pMode,
          scheduledTime,
          maxPlayers: 10,
          status: "waiting",
          drawnNumbers: [],
          gameMode: gMode,
          botsEnabled: botsCount > 0,
          maxBots: botsCount,
          isAutoCreated: true,
          theme: "emerald", // can specify default theme, or let them update it
          ...(autoRoomRadioUrl ? { onlineRadioUrl: autoRoomRadioUrl } : {}),
          fourBallsStage1Limit: gMode === "four_balls_double" ? 30 : null,
          fourBallsStage2Limit: gMode === "four_balls_double" ? 42 : null,
          fourBallsStage3Limit: gMode === "four_balls_double" ? 50 : null,
        };

        await setDoc(doc(db, "rooms", newRoomId), roomPayload);

        // Adicionar bots na coleção de players
        if (botsCount > 0) {
          const botNames = [
            "Arthur",
            "Daiane",
            "Camila",
            "Sandra",
            "Renato",
            "Bruno",
            "Carol",
            "Diego",
            "Eduardo",
            "Felipe",
            "Gisele",
            "Hugo",
            "Igor",
            "Julia",
            "Lucas",
          ];
          const shuffled = [...botNames].sort(() => 0.5 - Math.random());
          const botsToCreate = Math.min(botsCount, shuffled.length);

          for (let i = 0; i < botsToCreate; i++) {
            const botId = `bot_auto_${Math.random().toString(36).substring(2, 9)}`;
            const botCard = generateBingoCard(botId, shuffled[i]);
            await setDoc(doc(db, "rooms", newRoomId, "players", botId), {
              name: shuffled[i],
              card: {
                id: botCard.id,
                playerName: botCard.playerName,
                grid: serializeGrid(botCard.grid),
              },
            });
          }
        }
      }

      // Save next sequence number
      await setDoc(
        doc(db, "settings", "global_automation"),
        {
          roomSequenceNumber: currentSeq + quantityToCreate,
        },
        { merge: true },
      );

      console.log(
        `Automatic Scheduled Rooms created: quantity=${quantityToCreate}`,
      );
    } catch (e) {
      console.error("Auto room creator failure:", e);
    } finally {
      isCreatingAutoRoomRef.current = false;
    }
  };

  // Background Auto Room Scheduled loop
  useEffect(() => {
    if (!autoRoomEnabled || !appState.currentUser) return;

    const interval = setInterval(() => {
      // Check if current time is within the allowed daily window
      const now = new Date();
      const currentHourStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      let isWithinWindow = false;
      if (autoRoomStartHour <= autoRoomEndHour) {
        isWithinWindow =
          currentHourStr >= autoRoomStartHour &&
          currentHourStr <= autoRoomEndHour;
      } else {
        isWithinWindow =
          currentHourStr >= autoRoomStartHour ||
          currentHourStr <= autoRoomEndHour;
      }

      if (!isWithinWindow) {
        return; // Current time is outside the active automatic generation window
      }

      const autoRooms = appState.rooms.filter((r) => r.isAutoCreated);
      const totalActiveAutoRooms = autoRooms.filter(
        (r) => r.status === "waiting" || r.status === "active",
      ).length;
      const hasUpcomingAutoRoom = autoRooms.some((r) => r.status === "waiting");

      if (!hasUpcomingAutoRoom && totalActiveAutoRooms < 3) {
        triggerAutoRoomCreation();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [
    autoRoomEnabled,
    appState.rooms,
    autoRoomInterval,
    autoRoomStartHour,
    autoRoomEndHour,
  ]);

  // Monitoramento e auto-exclusão de salas com ganhador ou última bola sorteada após 30 segundos
  useEffect(() => {
    if (!appState.currentUser) return;
    appState.rooms.forEach((room) => {
      if (room.isAutoCreated && !scheduledDeletions.has(room.id)) {
        const winners = (room.players || []).filter((p) =>
          isCardWinner(p.card, room.drawnNumbers, room.gameMode || "full_card"),
        );
        const hasWinner = winners.length > 0;
        const reachedLastBall = room.drawnNumbers.length >= 75;
        const isFinished = room.status === "finished";

        if (isFinished || hasWinner || reachedLastBall) {
          setScheduledDeletions((prev) => {
            const next = new Set(prev);
            next.add(room.id);
            return next;
          });

          console.log(
            `[Auto Delete] Sorteio finalizado ou ganhador identificado na sala ${room.id}. Excluindo em 30 segundos...`,
          );
          setTimeout(async () => {
            try {
              const { doc, deleteDoc } = await import("firebase/firestore");
              const { db } = await import("./lib/firebase");
              await deleteDoc(doc(db, "rooms", room.id));
              console.log(
                `[Auto Delete] Sala ${room.id} excluída do Firestore com sucesso.`,
              );
            } catch (e) {
              console.error(
                `[Auto Delete] Erro ao excluir sala ${room.id} do Firestore:`,
                e,
              );
            }

            setAppState((prev) => ({
              ...prev,
              rooms: prev.rooms.filter((r) => r.id !== room.id),
            }));
          }, 30000);
        }
      }
    });
  }, [appState.rooms, scheduledDeletions]);

  // Background Interactive Bots AI Chat Commentary Simulation (Periodic Game commentary)
  useEffect(() => {
    const activeRoom = appState.rooms.find(
      (r) => r.id === appState.currentRoomId,
    );
    if (!activeRoom || activeRoom.status !== "active") return;
    if (!appState.currentUser) return;

    const botPlayers = (activeRoom.players || []).filter(
      (p) => p.id.startsWith("bot_") || p.id.includes("bot"),
    );
    if (botPlayers.length === 0) return;

    // Designate exactly one player client to run the background periodic commentaries to prevent duplicate triggers
    const humanPlayers = (activeRoom.players || []).filter(
      (p) => !p.id.startsWith("bot_") && !p.id.includes("bot"),
    );
    const sortedHumans = [...humanPlayers].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const isTriggerHost = sortedHumans[0]?.id === appState.currentUser.uid;

    if (!isTriggerHost) return;

    const chatTick = setInterval(async () => {
      // 40% probability of AI-generated commentary every 25 seconds
      if (Math.random() > 0.4) return;

      const randomBot =
        botPlayers[Math.floor(Math.random() * botPlayers.length)];

      try {
        const response = await fetch("/api/gemini/bot-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: activeRoom.name,
            drawnNumbers: activeRoom.drawnNumbers || [],
            players: activeRoom.players || [],
            messages: (activeRoom.messages || []).map((m) => ({
              id: m.id,
              senderId: m.senderId,
              senderName: m.senderName,
              text: m.text,
              timestamp: m.timestamp,
            })),
            triggerType: "periodic",
            targetBotName: randomBot.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const botMessageText = data.text;

        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("./lib/firebase");
        const messageId = `botmsg_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, "rooms", activeRoom.id, "messages", messageId), {
          senderId: randomBot.id,
          senderName: randomBot.name,
          text: botMessageText,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("AI periodic chat message error:", err);
      }
    }, 25000);

    return () => clearInterval(chatTick);
  }, [appState.currentRoomId, appState.rooms, appState.currentUser]);

  // Active user's client trigger for direct, real-time AI replies from bots in the chat
  useEffect(() => {
    const activeRoom = appState.rooms.find(
      (r) => r.id === appState.currentRoomId,
    );
    if (!activeRoom || activeRoom.status !== "active") return;
    if (!appState.currentUser) return;

    const messages = activeRoom.messages || [];
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isBot =
      lastMessage.senderId.startsWith("bot_") ||
      lastMessage.senderId.includes("bot") ||
      lastMessage.id.startsWith("botmsg");

    // Auth-gate: trigger ONLY if the last message came from the active client's user (avoid duplicate triggers)
    const isCurrentUserSender =
      lastMessage.senderId === appState.currentUser.uid;

    if (!isBot && isCurrentUserSender) {
      const botPlayers = (activeRoom.players || []).filter(
        (p) => p.id.startsWith("bot_") || p.id.includes("bot"),
      );
      if (botPlayers.length === 0) return;

      const timer = setTimeout(async () => {
        const randomBot =
          botPlayers[Math.floor(Math.random() * botPlayers.length)];

        try {
          const response = await fetch("/api/gemini/bot-message", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomName: activeRoom.name,
              drawnNumbers: activeRoom.drawnNumbers || [],
              players: activeRoom.players || [],
              messages: messages.map((m) => ({
                id: m.id,
                senderId: m.senderId,
                senderName: m.senderName,
                text: m.text,
                timestamp: m.timestamp,
              })),
              triggerType: "direct_reply",
              targetBotName: randomBot.name,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const botMessageText = data.text;

          const { doc, setDoc } = await import("firebase/firestore");
          const { db } = await import("./lib/firebase");
          const messageId = `botmsg_${Math.random().toString(36).substring(2, 9)}`;
          await setDoc(doc(db, "rooms", activeRoom.id, "messages", messageId), {
            senderId: randomBot.id,
            senderName: randomBot.name,
            text: botMessageText,
            timestamp: Date.now(),
          });
        } catch (e) {
          console.error("[AI Direct Reply] Error:", e);
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [appState.currentRoomId, appState.rooms, appState.currentUser]);

  // Sincronizar salas via onSnapshot em tempo real com subcoleção de jogadores para contagem exata de bots e players
  useEffect(() => {
    let unsubRooms: () => void = () => {};
    const playerUnsubs: { [roomId: string]: () => void } = {};

    const initRoomsRealtimeSync = async () => {
      try {
        const { collection, onSnapshot } = await import("firebase/firestore");
        const { db, handleFirestoreError, OperationType } =
          await import("./lib/firebase");

        unsubRooms = onSnapshot(
          collection(db, "rooms"),
          (snap) => {
            const roomsList: Room[] = [];
            const activeRoomIds = new Set<string>();

            snap.forEach((docSnap) => {
              const data = docSnap.data();
              activeRoomIds.add(docSnap.id);
              roomsList.push({
                id: docSnap.id,
                name: data.name,
                scheduledTime: data.scheduledTime,
                entryFee: data.entryFee,
                maxPlayers: data.maxPlayers || 10,
                status: data.status,
                drawnNumbers: data.drawnNumbers || [],
                players: [], // Sincronizado dinamicamente abaixo
                messages: [],
                gameMode: data.gameMode || "full_card",
                prize: data.prize || 100,
                bgMusicUrl: data.bgMusicUrl,
                onlineRadioUrl: data.onlineRadioUrl,
                backgroundImageUrl: data.backgroundImageUrl || null,
                roomIcon: data.roomIcon || null,
                botsEnabled: data.botsEnabled || false,
                maxBots: data.maxBots || 0,
                isAutoCreated: data.isAutoCreated || false,
              } as any);
            });

            // Limpa inscrições de salas deletadas
            Object.keys(playerUnsubs).forEach((rId) => {
              if (!activeRoomIds.has(rId)) {
                playerUnsubs[rId]();
                delete playerUnsubs[rId];
              }
            });

            // Abre escuta em tempo real dos jogadores de cada sala aberta para sincronizar bots e players
            roomsList.forEach((room) => {
              if (!playerUnsubs[room.id]) {
                playerUnsubs[room.id] = onSnapshot(
                  collection(db, "rooms", room.id, "players"),
                  (pSnap) => {
                    const fetchedPlayers: any[] = [];
                    pSnap.forEach((pDoc) => {
                      const d = pDoc.data();
                      const rawCard = d.card;
                      let finalCard = rawCard;
                      if (rawCard && Array.isArray(rawCard.grid)) {
                        const firstRow = rawCard.grid[0];
                        if (
                          firstRow &&
                          !Array.isArray(firstRow) &&
                          typeof firstRow === "object"
                        ) {
                          finalCard = {
                            ...rawCard,
                            grid: deserializeGrid(rawCard.grid),
                          };
                        }
                      }
                      fetchedPlayers.push({
                        id: pDoc.id,
                        name: d.name,
                        card: finalCard,
                      });
                    });

                    setAppState((prev) => ({
                      ...prev,
                      rooms: prev.rooms.map((r) =>
                        r.id === room.id
                          ? { ...r, players: fetchedPlayers }
                          : r,
                      ),
                    }));
                  },
                  (error) => {
                    handleFirestoreError(
                      error,
                      OperationType.GET,
                      `rooms/${room.id}/players`,
                      false,
                    );
                  },
                );
              }
            });

            setAppState((prev) => {
              const finalRooms = roomsList.map((item) => {
                const prevRoom = prev.rooms.find((pr) => pr.id === item.id);
                return {
                  ...item,
                  players: prevRoom ? prevRoom.players : [],
                  messages: prevRoom ? prevRoom.messages : [],
                };
              });
              return {
                ...prev,
                rooms: finalRooms,
              };
            });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, "rooms", false);
          },
        );
      } catch (err) {
        console.log("Real-time rooms listener error:", err);
      }
    };
    initRoomsRealtimeSync();

    return () => {
      unsubRooms();
      Object.values(playerUnsubs).forEach((unsub) => unsub());
    };
  }, [appState.currentUser]);

  // Sincronizar jogadores e chat em tempo real da sala de jogo atual
  useEffect(() => {
    if (!appState.currentRoomId) return;

    let unsubPlayers: () => void = () => {};
    let unsubMessages: () => void = () => {};
    let unsubRoomDoc: () => void = () => {};

    const initSubcollectionsSync = async () => {
      try {
        const { doc, collection, onSnapshot, query, orderBy } =
          await import("firebase/firestore");
        const { db, handleFirestoreError, OperationType } =
          await import("./lib/firebase");

        const rId = appState.currentRoomId!;

        // Sincronizar o próprio documento da sala para atualizações em tempo real do sorteio, status, dobras, etc.
        unsubRoomDoc = onSnapshot(
          doc(db, "rooms", rId),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setAppState((prev) => {
                const newRooms = prev.rooms.map((r) => {
                  if (r.id === rId) {
                    return {
                      ...r,
                      status: data.status,
                      drawnNumbers: data.drawnNumbers || [],
                      gameMode: data.gameMode || "full_card",
                      prize: data.prize || 100,
                      prizeMode: data.prizeMode,
                      doubleStage: data.doubleStage,
                      doubleStageTimer: data.doubleStageTimer,
                      fourBallsStage1Limit: data.fourBallsStage1Limit,
                      fourBallsStage2Limit: data.fourBallsStage2Limit,
                      fourBallsStage3Limit: data.fourBallsStage3Limit,
                      bgMusicUrl: data.bgMusicUrl,
                      onlineRadioUrl: data.onlineRadioUrl,
                    };
                  }
                  return r;
                });
                return { ...prev, rooms: newRooms };
              });
            }
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              `rooms/${rId}`,
              false,
            );
          },
        );

        unsubPlayers = onSnapshot(
          collection(db, "rooms", rId, "players"),
          (snap) => {
            const fetchedPlayers: any[] = [];
            snap.forEach((pSnap) => {
              const d = pSnap.data();
              const rawCard = d.card;
              let finalCard = rawCard;
              if (rawCard && Array.isArray(rawCard.grid)) {
                const firstRow = rawCard.grid[0];
                if (
                  firstRow &&
                  !Array.isArray(firstRow) &&
                  typeof firstRow === "object"
                ) {
                  finalCard = {
                    ...rawCard,
                    grid: deserializeGrid(rawCard.grid),
                  };
                }
              }
              fetchedPlayers.push({
                id: pSnap.id,
                name: d.name,
                card: finalCard,
              });
            });

            setAppState((prev) => {
              const newRooms = prev.rooms.map((r) => {
                if (r.id === rId) {
                  return { ...r, players: fetchedPlayers };
                }
                return r;
              });
              return { ...prev, rooms: newRooms };
            });
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              `rooms/${rId}/players`,
              false,
            );
          },
        );

        unsubMessages = onSnapshot(
          query(
            collection(db, "rooms", rId, "messages"),
            orderBy("timestamp", "asc"),
          ),
          (snap) => {
            const fetchedMsgs: any[] = [];
            snap.forEach((mSnap) => {
              const d = mSnap.data();
              fetchedMsgs.push({
                id: mSnap.id,
                senderId: d.senderId,
                senderName: d.senderName,
                text: d.text,
                timestamp: d.timestamp,
              });
            });

            setAppState((prev) => {
              const newRooms = prev.rooms.map((r) => {
                if (r.id === rId) {
                  return { ...r, messages: fetchedMsgs };
                }
                return r;
              });
              return { ...prev, rooms: newRooms };
            });
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              `rooms/${rId}/messages`,
              false,
            );
          },
        );
      } catch (err) {
        console.error("Subcollections sync failure:", err);
      }
    };

    initSubcollectionsSync();

    return () => {
      unsubPlayers();
      unsubMessages();
      unsubRoomDoc();
    };
  }, [appState.currentRoomId]);

  // Listen to completed games and process winner rewards
  useEffect(() => {
    if (!appState.currentUser) return;

    const finishedRoom = appState.rooms.find(
      (r) => r.id === appState.currentRoomId && r.status === "finished",
    );

    if (finishedRoom && !processedRooms.has(finishedRoom.id)) {
      setProcessedRooms((prev) => {
        const next = new Set(prev);
        next.add(finishedRoom.id);
        return next;
      });

      const getRequiredDoubleLevel = (stage: number) => {
        if (stage <= 1) return 0;
        if (stage <= 3) return 1;
        return 2;
      };

      const isFourBalls = finishedRoom.gameMode === "four_balls_double";
      const currentStage = finishedRoom.doubleStage || 0;

      const eligibleForWinner = (finishedRoom.players || []).filter((p) => {
        if (!isFourBalls) return true;
        const acceptedLevel = p.doubleStageAccepted || 0;
        return acceptedLevel >= getRequiredDoubleLevel(currentStage);
      });

      const modeToCheck = isFourBalls
        ? "block_of_4"
        : finishedRoom.gameMode || "full_card";
      const winners = eligibleForWinner.filter((p) =>
        isCardWinner(p.card, finishedRoom.drawnNumbers, modeToCheck),
      );

      const isUserWinner = appState.currentUser
        ? winners.some((w) => w.id === appState.currentUser!.uid)
        : false;
      const actualPrize = getRoomCurrentPrize(finishedRoom);
      const sharePrize =
        actualPrize && winners.length > 0
          ? Math.floor(actualPrize / winners.length)
          : 0;

      if (isUserWinner && sharePrize > 0) {
        const creditAward = async () => {
          try {
            const { doc, getDoc, updateDoc } =
              await import("firebase/firestore");
            const { db, handleFirestoreError, OperationType } =
              await import("./lib/firebase");

            const userRef = doc(db, "users", appState.currentUser!.uid);
            let userSnap;
            try {
              userSnap = await getDoc(userRef);
            } catch (dbErr) {
              handleFirestoreError(
                dbErr,
                OperationType.GET,
                `users/${appState.currentUser!.uid}`,
              );
            }
            if (userSnap && userSnap.exists()) {
              const currentCoins = userSnap.data().coins || 0;
              try {
                await updateDoc(userRef, {
                  coins: currentCoins + sharePrize,
                });
              } catch (dbErr) {
                handleFirestoreError(
                  dbErr,
                  OperationType.UPDATE,
                  `users/${appState.currentUser!.uid}`,
                );
              }

              setAppState((prev) => ({
                ...prev,
                currentUser: prev.currentUser
                  ? {
                      ...prev.currentUser,
                      coins: currentCoins + sharePrize,
                    }
                  : null,
              }));

              toast.success(`🎉 BINGO! Você faturou ${sharePrize} moedas! 🏆`, {
                duration: 8000,
              });
            }
          } catch (e) {
            console.error("Error crediting winners:", e);
          }
        };
        creditAward();
      } else {
        if (winners.length > 0) {
          const winnerNames = winners.map((w) => w.name).join(", ");
          toast.success(`Rodada finalizada! Ganhador(es): ${winnerNames}`, {
            duration: 6000,
          });
        } else {
          toast.success(`Rodada terminada. Retornando ao lobby...`, {
            duration: 4000,
          });
        }
      }

      setTimeout(() => {
        setAppState((prev) => ({
          ...prev,
          view: "player_lobby",
          currentRoomId: null,
        }));
      }, 5000);
    }
  }, [
    appState.rooms,
    appState.currentRoomId,
    appState.currentUser,
    processedRooms,
  ]);

  // Sincroniza início de salas agendadas no Firestore em tempo real de forma idempotente
  useEffect(() => {
    if (!appState.currentUser) return;
    const clockStatus = setInterval(() => {
      appState.rooms.forEach(async (room) => {
        if (room.status === "waiting" && Date.now() >= room.scheduledTime) {
          try {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db, handleFirestoreError, OperationType } =
              await import("./lib/firebase");
            try {
              await updateDoc(doc(db, "rooms", room.id), { status: "active" });
            } catch (dbErr) {
              handleFirestoreError(
                dbErr,
                OperationType.UPDATE,
                `rooms/${room.id}`,
              );
            }
            console.log(
              `[Scheduled Start] Sala ${room.id} decolou no Firestore com sucesso.`,
            );
          } catch (e) {
            console.error(e);
          }
        }
      });
    }, 1000);
    return () => clearInterval(clockStatus);
  }, [appState.rooms, appState.currentUser]);

  // Inicia salas bot_vs_bot imediatamente quando alguém entra para assistir a demonstração
  useEffect(() => {
    if (!appState.currentRoomId || !appState.currentUser) return;
    const room = appState.rooms.find((r) => r.id === appState.currentRoomId);
    if (room && room.gameMode === "bot_vs_bot" && room.status === "waiting") {
      const autoStart = async () => {
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db, handleFirestoreError, OperationType } =
            await import("./lib/firebase");
          try {
            await updateDoc(doc(db, "rooms", room.id), { status: "active" });
          } catch (dbErr) {
            handleFirestoreError(
              dbErr,
              OperationType.UPDATE,
              `rooms/${room.id}`,
            );
          }
          console.log(
            `[Bot vs Bot Start] Sala demo ${room.id} decolou imediatamente.`,
          );
        } catch (e) {
          console.error("Erro ao ativar sala bot_vs_bot:", e);
        }
      };
      autoStart();
    }
  }, [appState.currentRoomId, appState.rooms, appState.currentUser]);

  // Motor Distribuído: Host autoritativo sorteia as bolas diretamente no Firestore
  useEffect(() => {
    if (!appState.currentUser) return;

    const activeRooms = appState.rooms.filter((r) => r.status === "active");
    if (activeRooms.length === 0) return;

    const interval = setInterval(() => {
      activeRooms.forEach(async (room) => {
        // Define se este usuário logado atua como coordenador do sorteio nesta rodada:
        // Se for admin e estiver ativamente visualizando o painel com autodraw ligado, ou o primeiro jogador (por ordem alfabética de UID) se o admin estiver ausente ou para salas automáticas.
        const isHost = (() => {
          if (room.gameMode === "bot_vs_bot") {
            return appState.currentRoomId === room.id;
          }
          if (appState.currentUser?.role === "admin") {
            return appState.currentRoomId === room.id && isAdminAutoDraw;
          }

          const normalPlayers = (room.players || []).filter(
            (p) => !p.id.startsWith("bot_"),
          );
          if (normalPlayers.length === 0) {
            return false;
          }

          const sortedNormalPlayers = [...normalPlayers].sort((a, b) =>
            a.id.localeCompare(b.id),
          );
          return sortedNormalPlayers[0]?.id === appState.currentUser?.uid;
        })();

        if (!isHost) return;

        // Helper to send messages
        const sendSystemMessage = async (rId: string, msgText: string) => {
          try {
            const { collection, addDoc } = await import("firebase/firestore");
            const { db } = await import("./lib/firebase");
            await addDoc(collection(db, "rooms", rId, "messages"), {
              senderId: "system",
              senderName: "Sistema 📢",
              text: msgText,
              timestamp: Date.now(),
            });
          } catch (e) {
            console.error("Erro ao enviar mensagem do sistema:", e);
          }
        };

        const isFourBalls = room.gameMode === "four_balls_double";
        const numDrawn = room.drawnNumbers.length;
        const currentStage = room.doubleStage || 0;

        // 1. Get eligible active players for evaluating winners based on current double stage
        const getRequiredDoubleLevel = (stage: number) => {
          if (stage <= 1) return 0;
          if (stage <= 3) return 1;
          return 2;
        };

        const eligiblePlayers = (room.players || []).filter((p) => {
          if (!isFourBalls) return true;
          const acceptedLevel = p.doubleStageAccepted || 0;
          return acceptedLevel >= getRequiredDoubleLevel(currentStage);
        });

        // 2. See if there is a winner among active eligible players
        const modeToCheck = isFourBalls
          ? "block_of_4"
          : room.gameMode || "full_card";
        const winners = eligiblePlayers.filter((p) =>
          isCardWinner(p.card, room.drawnNumbers, modeToCheck),
        );

        if (winners.length > 0 || room.drawnNumbers.length >= 75) {
          try {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("./lib/firebase");
            await updateDoc(doc(db, "rooms", room.id), { status: "finished" });
            if (appState.currentUser?.role === "admin") {
              setIsAdminAutoDraw(false);
            }
          } catch (e) {
            console.error("Erro ao encerrar a sala no Firestore:", e);
          }
          return;
        }

        // 3. Handle four_balls_double custom transitions
        if (isFourBalls) {
          const limit1 = room.fourBallsStage1Limit || 30;
          const limit2 = room.fourBallsStage2Limit || 42;
          const limit3 = room.fourBallsStage3Limit || 50;
          const diff12 = limit2 - limit1;
          const diff23 = limit3 - limit2;

          // A. Check if we reached first threshold and haven't prompted yet
          if (numDrawn === limit1 && currentStage === 0) {
            try {
              const { doc, updateDoc } = await import("firebase/firestore");
              const { db } = await import("./lib/firebase");
              await updateDoc(doc(db, "rooms", room.id), {
                doubleStage: 1,
                doubleStageTimer: Date.now() + 20000,
              });

              // Simulate bot decisions (75% probability accept, 25% decline)
              const { collection, getDocs } =
                await import("firebase/firestore");
              const playersCol = collection(db, "rooms", room.id, "players");
              const playersSnap = await getDocs(playersCol);
              playersSnap.forEach(async (pDoc) => {
                const pId = pDoc.id;
                const isBot = pId.startsWith("bot_") || pId.includes("bot");
                if (isBot) {
                  const accepted = Math.random() < 0.75 ? 1 : -1;
                  await updateDoc(doc(db, "rooms", room.id, "players", pId), {
                    doubleStageAccepted: accepted,
                  });
                }
              });

              await sendSystemMessage(
                room.id,
                `⚠️ O sorteio atingiu ${limit1} bolas sem ganhador! ACEITE A DOBRA em até 20 segundos para comprar ${diff12} bolas extras e continuar jogando!`,
              );
            } catch (e) {
              console.error("Erro ao iniciar 1ª dobra:", e);
            }
            return;
          }

          // B. If in stage 1, check if timer is up or all human players have responded
          if (currentStage === 1) {
            const timerExpired = Date.now() > (room.doubleStageTimer || 0);
            const humans = (room.players || []).filter(
              (p) => !p.id.startsWith("bot_"),
            );
            const allHumansResponded =
              humans.length > 0 &&
              humans.every(
                (p) =>
                  p.doubleStageAccepted !== undefined &&
                  p.doubleStageAccepted !== 0,
              );

            if (timerExpired || allHumansResponded) {
              try {
                const { doc, updateDoc, collection, getDocs } =
                  await import("firebase/firestore");
                const { db } = await import("./lib/firebase");

                // Get list of players who accepted
                const playersCol = collection(db, "rooms", room.id, "players");
                const playersSnap = await getDocs(playersCol);
                const acceptedList: string[] = [];
                playersSnap.forEach((pDoc) => {
                  const pData = pDoc.data();
                  if (
                    pData.doubleStageAccepted &&
                    pData.doubleStageAccepted >= 1
                  ) {
                    acceptedList.push(pDoc.id);
                  }
                });

                if (acceptedList.length === 0) {
                  // No one accepted! End game.
                  await updateDoc(doc(db, "rooms", room.id), {
                    doubleStage: 5,
                    status: "finished",
                  });
                  await sendSystemMessage(
                    room.id,
                    "❌ Jogo Encerrado: nenhum jogador aceitou a dobra. Você perdeu!",
                  );
                } else {
                  // Proceed to stage 2 (ready to draw up to limit2)
                  await updateDoc(doc(db, "rooms", room.id), {
                    doubleStage: 2,
                  });
                  await sendSystemMessage(
                    room.id,
                    `🚀 Sorteio retomado! Participantes sobreviventes: ${acceptedList.length}. Sorteando mais ${diff12} bolas!`,
                  );
                }
              } catch (e) {
                console.error("Erro ao progredir para stage 2:", e);
              }
            }
            return;
          }

          // C. Check if we reached second threshold and haven't prompted yet
          if (numDrawn === limit2 && currentStage === 2) {
            try {
              const { doc, updateDoc } = await import("firebase/firestore");
              const { db } = await import("./lib/firebase");
              await updateDoc(doc(db, "rooms", room.id), {
                doubleStage: 3,
                doubleStageTimer: Date.now() + 20000,
              });

              // Simulate bot decisions (who accepted stage 1, will now decide for stage 2)
              const { collection, getDocs } =
                await import("firebase/firestore");
              const playersCol = collection(db, "rooms", room.id, "players");
              const playersSnap = await getDocs(playersCol);
              playersSnap.forEach(async (pDoc) => {
                const pId = pDoc.id;
                const pData = pDoc.data();
                const isBot = pId.startsWith("bot_") || pId.includes("bot");
                if (isBot && pData.doubleStageAccepted === 1) {
                  const accepted = Math.random() < 0.75 ? 2 : -1;
                  await updateDoc(doc(db, "rooms", room.id, "players", pId), {
                    doubleStageAccepted: accepted,
                  });
                }
              });

              await sendSystemMessage(
                room.id,
                `⚠️ Última Rodada! Sem ganhador até as ${limit2} bolas! ACEITE A SEGUNDA DOBRA em até 20 segundos para comprar ${diff23} bolas finais!`,
              );
            } catch (e) {
              console.error("Erro ao iniciar 2ª dobra:", e);
            }
            return;
          }

          // D. If in stage 3, check if timer is up or all humans who accepted stage 1 have decided
          if (currentStage === 3) {
            const timerExpired = Date.now() > (room.doubleStageTimer || 0);
            const humansEligible = (room.players || []).filter(
              (p) => !p.id.startsWith("bot_") && p.doubleStageAccepted === 1,
            );
            const allResponded =
              humansEligible.length > 0 &&
              humansEligible.every(
                (p) =>
                  p.doubleStageAccepted === 2 || p.doubleStageAccepted === -1,
              );

            if (timerExpired || allResponded) {
              try {
                const { doc, updateDoc, collection, getDocs } =
                  await import("firebase/firestore");
                const { db } = await import("./lib/firebase");

                const playersCol = collection(db, "rooms", room.id, "players");
                const playersSnap = await getDocs(playersCol);
                const acceptedList: string[] = [];
                playersSnap.forEach((pDoc) => {
                  const pData = pDoc.data();
                  if (
                    pData.doubleStageAccepted &&
                    pData.doubleStageAccepted >= 2
                  ) {
                    acceptedList.push(pDoc.id);
                  }
                });

                if (acceptedList.length === 0) {
                  await updateDoc(doc(db, "rooms", room.id), {
                    doubleStage: 5,
                    status: "finished",
                  });
                  await sendSystemMessage(
                    room.id,
                    "❌ Jogo Encerrado: nenhum sobrevivente aceitou a última dobra. Você perdeu!",
                  );
                } else {
                  await updateDoc(doc(db, "rooms", room.id), {
                    doubleStage: 4,
                  });
                  await sendSystemMessage(
                    room.id,
                    `🚀 Sorteio final retomado! Participantes sobreviventes: ${acceptedList.length}. Sorteando as últimas ${diff23} bolas!`,
                  );
                }
              } catch (e) {
                console.error("Erro ao progredir para stage 4:", e);
              }
            }
            return;
          }

          // E. Check if we reached the absolute limit of balls with no survivor winning
          if (numDrawn === limit3 && currentStage === 4) {
            try {
              const { doc, updateDoc } = await import("firebase/firestore");
              const { db } = await import("./lib/firebase");
              await updateDoc(doc(db, "rooms", room.id), {
                doubleStage: 5,
                status: "finished",
              });
              await sendSystemMessage(
                room.id,
                `💀 Fim do jogo: o limite de ${limit3} bolas foi atingido sem vencedor nas dobras. Você perdeu!`,
              );
            } catch (e) {
              console.error("Erro ao encerrar jogo sem vencedores:", e);
            }
            return;
          }
        }

        // 4. Default: Sorteia próximo número livre
        let available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
          (n) => !room.drawnNumbers.includes(n),
        );
        if (available.length > 0) {
          const nextNum =
            available[Math.floor(Math.random() * available.length)];
          try {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("./lib/firebase");
            await updateDoc(doc(db, "rooms", room.id), {
              drawnNumbers: [...room.drawnNumbers, nextNum],
            });
          } catch (e) {
            console.error("Erro ao sortear próximo número no Firestore:", e);
          }
        }
      });
    }, 5000); // Sorteio a cada 5 segundos

    return () => clearInterval(interval);
  }, [
    appState.rooms,
    appState.currentUser,
    appState.currentRoomId,
    isAdminAutoDraw,
  ]);

  useEffect(() => {
    if (appState.currentRoomId && appState.view === "player_game") {
      const roomExists = appState.rooms.some(
        (r) => r.id === appState.currentRoomId,
      );
      if (!roomExists) {
        setAppState((prev) => ({
          ...prev,
          view: "player_lobby",
          currentRoomId: null,
        }));
      }
    }
  }, [appState.rooms, appState.currentRoomId, appState.view]);

  if (appState.showAuth) {
    return (
      <>
        <Toaster position="top-center" />
        <AuthScreen
          onLoginSuccess={handleLoginSuccess}
          onGoBack={() => setAppState((prev) => ({ ...prev, showAuth: false }))}
        />
      </>
    );
  }

  if (appState.view === "admin") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
        <Toaster position="top-center" />
        {/* Beautiful Responsive Unified Admin Header Card */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 shadow-sm transition-colors sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Logo / Brand */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg md:text-xl text-slate-800 dark:text-white tracking-tight shrink-0">
                Admin<span className="text-emerald-500">Bingo</span>
              </span>
            </div>

            {/* Tab Navigation Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/85 overflow-x-auto max-w-full sm:w-auto scrollbar-none shrink-0">
              <button
                onClick={() => setAdminTab("rooms")}
                className={`px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                  adminTab === "rooms"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Salas</span>
              </button>
              <button
                onClick={() => setAdminTab("users")}
                className={`px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                  adminTab === "users"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Usuários</span>
              </button>
              <button
                onClick={() => setAdminTab("financial")}
                className={`px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                  adminTab === "financial"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Financeiro</span>
              </button>
              <button
                onClick={() =>
                  setAppState((prev) => ({ ...prev, view: "player_lobby" }))
                }
                className="px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Modo Jogador</span>
              </button>
            </div>

            {/* Action triggers */}
            <div className="flex items-center gap-2">
              {/* Dark mode button directly on header for easy toggling! */}
              <button
                onClick={() => {
                  const isDark = appState.settings?.darkMode;
                  setAppState((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      darkMode: !isDark,
                    },
                  }));
                }}
                title="Alternar Tema"
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {appState.settings?.darkMode ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900 font-extrabold text-xs px-2.5 md:px-3 text-xs h-9 rounded-xl transition-all flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 pb-20">
          {adminTab === "rooms" ? (
            appState.currentRoomId ? (
              (() => {
                const room = appState.rooms.find(
                  (r) => r.id === appState.currentRoomId,
                );
                if (!room) {
                  setAppState((prev) => ({ ...prev, currentRoomId: null }));
                  return null;
                }
                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm mb-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setAppState((prev) => ({
                              ...prev,
                              currentRoomId: null,
                            }))
                          }
                          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-extrabold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs transition-colors border border-slate-200/40 dark:border-slate-700"
                        >
                          ← Voltar
                        </button>
                        <h2 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm md:text-base">
                          {room.name} — Painel Sorteio Ativo
                        </h2>
                      </div>
                      <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {(room.players || []).length} participante(s) ativo(s)
                      </div>
                    </div>
                    <Dashboard
                      gameState={{
                        drawnNumbers: room.drawnNumbers,
                        cards: [],
                        isGameActive: room.drawnNumbers.length > 0,
                      }}
                      isAutoDraw={isAdminAutoDraw}
                      isSpeechEnabled={isAdminSpeechEnabled}
                      voiceGender={adminVoiceGender}
                      bgMusicUrl={room.bgMusicUrl}
                      onToggleAutoDraw={() => {
                        setAppState((prev) => ({
                          ...prev,
                          rooms: prev.rooms.map((r) =>
                            r.id === room.id
                              ? {
                                  ...r,
                                  status:
                                    r.status === "active"
                                      ? "waiting"
                                      : "active",
                                }
                              : r,
                          ),
                        }));
                        setIsAdminAutoDraw(room.status !== "active");
                      }}
                      onToggleSpeech={() =>
                        setIsAdminSpeechEnabled((prev) => !prev)
                      }
                      onToggleVoiceGender={() =>
                        setAdminVoiceGender((prev) =>
                          prev === "female" ? "male" : "female",
                        )
                      }
                      onDrawNumber={() => {
                        let available = Array.from(
                          { length: 75 },
                          (_, i) => i + 1,
                        ).filter((n) => !room.drawnNumbers.includes(n));
                        if (available.length > 0)
                          handleDrawNumberAdmin(
                            room.id,
                            available[
                              Math.floor(Math.random() * available.length)
                            ],
                          );
                      }}
                      onResetGame={() => {
                        handleResetGameAdmin(room.id);
                        setIsAdminAutoDraw(false);
                      }}
                    />
                  </div>
                );
              })()
            ) : (
              <AdminRooms
                rooms={appState.rooms}
                onCreateRoom={handleCreateRoom}
                onEnterRoom={(id) => {
                  audioController.init();
                  setAppState((prev) => ({ ...prev, currentRoomId: id }));
                }}
                onDeleteRoom={handleDeleteRoom}
                onUpdateRoomSettings={handleUpdateRoomSettings}
                autoRoomEnabled={autoRoomEnabled}
                autoRoomInterval={autoRoomInterval}
                autoRoomStartHour={autoRoomStartHour}
                autoRoomEndHour={autoRoomEndHour}
                autoRoomRadioUrl={autoRoomRadioUrl}
                autoRoomBotsCount={autoRoomBotsCount}
                autoRoomBaseName={autoRoomBaseName}
                autoRoomSequenceNumber={autoRoomSequenceNumber}
                autoRoomGameMode={autoRoomGameMode}
                autoRoomQuantity={autoRoomQuantity}
                autoRoomEntryFee={autoRoomEntryFee}
                autoRoomPrizeMode={autoRoomPrizeMode}
                autoRoomPrizeValue={autoRoomPrizeValue}
                onToggleAutoRoomEnabled={handleToggleAutoRoomEnabled}
                onUpdateAutoRoomInterval={handleUpdateAutoRoomInterval}
                onUpdateAutoRoomHours={handleUpdateAutoRoomHours}
                onUpdateAutoRoomRadioUrl={handleUpdateAutoRoomRadioUrl}
                onUpdateAutoRoomBotsCount={handleUpdateAutoRoomBotsCount}
                onUpdateAutoRoomBaseName={handleUpdateAutoRoomBaseName}
                onUpdateAutoRoomSequenceNumber={
                  handleUpdateAutoRoomSequenceNumber
                }
                onUpdateAutoRoomGameMode={handleUpdateAutoRoomGameMode}
                onUpdateAutoRoomQuantity={handleUpdateAutoRoomQuantity}
                onUpdateAutoRoomEntryFee={handleUpdateAutoRoomEntryFee}
                onUpdateAutoRoomPrizeMode={handleUpdateAutoRoomPrizeMode}
                onUpdateAutoRoomPrizeValue={handleUpdateAutoRoomPrizeValue}
              />
            )
          ) : adminTab === "users" ? (
            <AdminUsers onGoBack={() => setAdminTab("rooms")} />
          ) : (
            <AdminFinancial onGoBack={() => setAdminTab("rooms")} />
          )}
        </main>
      </div>
    );
  }

  if (appState.view === "player_lobby") {
    const isAdmin = appState.currentUser?.role === "admin";
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors pt-6 sm:pt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appState.currentUser ? (
              <button
                onClick={handleLogout}
                className="text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors"
              >
                Sair
              </button>
            ) : (
              <button
                onClick={() => setAppState(prev => ({ ...prev, showAuth: true }))}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                Entrar
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() =>
                  setAppState((prev) => ({ ...prev, view: "admin" }))
                }
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl shadow-md border border-indigo-500 transition-all active:scale-95 text-xs uppercase tracking-wider shrink-0"
              >
                ← Painel de Admin
              </button>
            )}
          </div>

          {/* Quick dark mode button in player lobby header */}
          <button
            onClick={() => {
              const isDark = appState.settings?.darkMode;
              setAppState((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  darkMode: !isDark,
                },
              }));
            }}
            title="Alternar Tema"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
          >
            {appState.settings?.darkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
        <PlayerLobby
          autoRoomEnabled={autoRoomEnabled}
          appState={appState}
          onJoinRoom={handleJoinRoom}
          onEnterRoom={(id) => {
            audioController.init();
            setAppState((prev) => ({
              ...prev,
              view: "player_game",
              currentRoomId: id,
            }));
          }}
          onOpenProfile={() =>
            setAppState((prev) => ({ ...prev, view: "profile" }))
          }
        />
      </div>
    );
  }

  if (appState.view === "player_game" && appState.currentRoomId) {
    const room = appState.rooms.find((r) => r.id === appState.currentRoomId);
    if (!room) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              Sala não encontrada
            </h3>
            <p className="text-slate-550 dark:text-slate-400 text-xs font-semibold">
              Esta sala pode ter sido encerrada ou excluída pelo administrador.
              Retornando ao saguão...
            </p>
            <button
              onClick={() =>
                setAppState((prev) => ({
                  ...prev,
                  view: "player_lobby",
                  currentRoomId: null,
                }))
              }
              className="w-full py-2.5 bg-indigo-600 dark:bg-indigo-650 hover:bg-indigo-750 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all"
            >
              Voltar para o Saguão
            </button>
          </div>
        </div>
      );
    }

    const playersList = room.players || [];
    const player = playersList.find(
      (p) => p.id === (appState.currentUser?.uid || ""),
    );
    const isSpectator = !player;
    const card = player ? player.card : spectatorCard;

    // Calculate time left (simulated)
    const timeLeftSeconds = Math.max(
      0,
      Math.floor((room.scheduledTime - Date.now()) / 1000),
    );

    return (
      <>
        <Toaster position="top-center" />
        <PlayerMobileView
          card={card}
          drawnNumbers={room.drawnNumbers || []}
          user={{
            ...(appState.currentUser || {
              uid: "spectator",
              name: "Espectador",
              email: "",
              coins: 0,
              role: "player" as const,
            }),
            avatar:
              appState.currentUser?.photoURL ||
              "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                (appState.currentUser?.name || "Espectador"),
          }}
          timeLeft={timeLeftSeconds}
          scheduledTime={room.scheduledTime}
          messages={room.messages || []}
          gameMode={room.gameMode}
          prize={getRoomCurrentPrize(room)}
          isSpectator={isSpectator}
          initialSoundEnabled={appState.settings?.soundEnabled ?? true}
          bgMusicUrl={room.bgMusicUrl}
          onlineRadioUrl={room.onlineRadioUrl}
          participants={playersList.map((p) => {
            // We don't have the full User object in room.players in this mock, just id and name.
            // In a real app we'd fetch their photoURL. For now we use dicebear.
            const fullUser =
              appState.currentUser?.uid === p.id ? appState.currentUser : null;
            return {
              uid: p.id,
              name: p.name,
              avatar:
                fullUser?.photoURL ||
                "https://api.dicebear.com/7.x/avataaars/svg?seed=" + p.name,
            };
          })}
          playersList={playersList}
          room={room}
          onUpdateCoins={(newCoins) =>
            setAppState((prev) => ({
              ...prev,
              currentUser: prev.currentUser
                ? { ...prev.currentUser, coins: newCoins }
                : null,
            }))
          }
          theme={room.theme || "emerald"}
          onExit={() =>
            setAppState((prev) => ({
              ...prev,
              view: "player_lobby",
              currentRoomId: null,
            }))
          }
          onSendMessage={(text) => handleSendMessage(room.id, text)}
          onOpenProfile={() =>
            setAppState((prev) => ({ ...prev, view: "profile" }))
          }
        />
      </>
    );
  }

  if (appState.view === "settings") {
    return (
      <>
        <Toaster position="top-center" />
        <SettingsScreen
          settings={appState.settings}
          onUpdateSettings={(newSettings) =>
            setAppState((prev) => ({ ...prev, settings: newSettings }))
          }
          onGoBack={() => setAppState((prev) => ({ ...prev, view: "profile" }))}
        />
      </>
    );
  }

  if (appState.view === "profile" && appState.currentUser) {
    return (
      <>
        <Toaster position="top-center" />
        <ProfileScreen
          user={appState.currentUser}
          onGoBack={() =>
            setAppState((prev) => ({
              ...prev,
              view: prev.currentRoomId ? "player_game" : "player_lobby",
            }))
          }
          onLogout={() =>
            setAppState((prev) => ({
              ...prev,
              view: "player_lobby",
              currentUser: null,
              currentRoomId: null,
            }))
          }
          onGoSettings={() =>
            setAppState((prev) => ({ ...prev, view: "settings" }))
          }
          onUpdateProfilePhoto={handleUpdateProfilePhoto}
        />
      </>
    );
  }

  return null;
}
