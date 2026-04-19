import { useEffect, useMemo, useRef, useState } from "react";
import {
  createOrder,
  getAvailability,
  getCurrentBusiness,
  getCustomerOrders,
  getMenu,
  lookupCustomer,
} from "../lib/api";
import {
  CUSTOM_PIZZA_BASES,
  CUSTOM_PIZZA_MAX_TOPPINGS,
  CUSTOM_PIZZA_TOPPINGS,
  LOYALTY_GOAL,
  MENU_SECTIONS,
} from "../constants";
import {
  getMenuSectionId,
  itemMatchesQuickFilter,
  nextOpenDates,
  todayISO,
} from "../utils/format";

export default function useCustomerController() {
  // Esperienza pubblica cliente: menu, configuratore pizza, carrello, checkout e
  // recupero ordine convivono qui finche' il frontend non verra' diviso.
  const [menu, setMenu] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [cart, setCart] = useState([]);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [availability, setAvailability] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuSection, setActiveMenuSection] = useState(
    MENU_SECTIONS[0].id,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [addedItemId, setAddedItemId] = useState("");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [customPizzaOpen, setCustomPizzaOpen] = useState(false);
  const [customPizzaBaseId, setCustomPizzaBaseId] = useState("");
  const [customPizzaToppings, setCustomPizzaToppings] = useState([]);
  const [customPizzaNotes, setCustomPizzaNotes] = useState("");
  const customPizzaRef = useRef(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const customPizzaBase = useMemo(
    () =>
      CUSTOM_PIZZA_BASES.find((base) => base.id === customPizzaBaseId) || null,
    [customPizzaBaseId],
  );
  const customPizzaSelectedToppings = useMemo(
    () =>
      CUSTOM_PIZZA_TOPPINGS.filter((topping) =>
        customPizzaToppings.includes(topping.id),
      ),
    [customPizzaToppings],
  );
  const customPizzaPrice = useMemo(
    () =>
      (customPizzaBase?.price || 0) +
      customPizzaSelectedToppings.reduce(
        (sum, topping) => sum + topping.price,
        0,
      ),
    [customPizzaBase, customPizzaSelectedToppings],
  );

  const dateOptions = useMemo(() => nextOpenDates(7), []);

  const visibleCustomerSlots = useMemo(
    () =>
      (availability?.slots || []).filter((slot) => !slot.full && !slot.past),
    [availability],
  );

  const filteredMenu = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return menu.filter((item) => {
      const haystack = `${item.name || ""} ${item.description || ""} ${(
        item.tags || []
      ).join(" ")}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesFilters = activeFilters.every((filterId) =>
        itemMatchesQuickFilter(item, filterId),
      );

      return matchesSearch && matchesFilters;
    });
  }, [activeFilters, menu, searchTerm]);

  const menuBySection = useMemo(() => {
    return MENU_SECTIONS.map((section) => ({
      ...section,
      items: filteredMenu.filter(
        (item) => getMenuSectionId(item) === section.id,
      ),
    })).filter(
      (section) => section.items.length > 0 || section.id === "pizze-tonde",
    );
  }, [filteredMenu]);

  const activeMenu = useMemo(() => {
    return (
      menuBySection.find((section) => section.id === activeMenuSection) ||
      menuBySection[0]
    );
  }, [activeMenuSection, menuBySection]);
  const loyaltyPoints = customerProfile?.customer?.points || 0;
  const loyaltyCyclePoints =
    loyaltyPoints > 0 && loyaltyPoints % LOYALTY_GOAL === 0
      ? LOYALTY_GOAL
      : loyaltyPoints % LOYALTY_GOAL;
  const loyaltyRemaining = Math.max(LOYALTY_GOAL - loyaltyCyclePoints, 0);

  useEffect(() => {
    Promise.allSettled([getMenu(), getCurrentBusiness()])
      .then(([menuResult, businessResult]) => {
        if (menuResult.status === "fulfilled") {
          setMenu(menuResult.value);
        } else {
          notify("Menu non disponibile. Riprova tra poco.");
        }

        if (businessResult.status === "fulfilled") {
          setCurrentBusiness(businessResult.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeMenu && menuBySection[0]) {
      setActiveMenuSection(menuBySection[0].id);
      return;
    }

    if (
      activeMenu &&
      !menuBySection.some((section) => section.id === activeMenuSection)
    ) {
      setActiveMenuSection(menuBySection[0]?.id || MENU_SECTIONS[0].id);
    }
  }, [activeMenu, activeMenuSection, menuBySection]);

  useEffect(() => {
    if (!dateOptions.includes(pickupDate)) {
      setPickupDate(dateOptions[0] || todayISO());
    }
  }, [dateOptions, pickupDate]);

  useEffect(() => {
    setSelectedSlot("");
    getAvailability(pickupDate)
      .then(setAvailability)
      .catch(() => {
        setAvailability(null);
        notify("Fasce orarie non disponibili.");
      });
  }, [pickupDate]);

  useEffect(() => {
    if (normalizedPhone.length < 6) {
      setCustomerProfile(null);
      setCustomerOrders([]);
      setCustomerOrdersLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerLookupLoading(true);
    setCustomerOrdersLoading(true);

    const timer = window.setTimeout(() => {
      Promise.allSettled([
        lookupCustomer(normalizedPhone),
        getCustomerOrders(normalizedPhone),
      ])
        .then(([profileResult, ordersResult]) => {
          if (cancelled) return;

          if (profileResult.status === "fulfilled") {
            const data = profileResult.value;
            setCustomerProfile(data.found ? data : null);
            if (data.found && data.customer?.name && !customer.trim()) {
              setCustomer(data.customer.name);
            }
          } else {
            setCustomerProfile(null);
          }

          setCustomerOrders(
            ordersResult.status === "fulfilled" ? ordersResult.value : [],
          );
        })
        .finally(() => {
          if (!cancelled) {
            setCustomerLookupLoading(false);
            setCustomerOrdersLoading(false);
          }
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedPhone]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", mobileCartOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [mobileCartOpen]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2600);
  }

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item._id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item._id ? { ...entry, qty: entry.qty + 1 } : entry,
        );
      }
      return [
        ...current,
        {
          id: item._id,
          name: item.name,
          price: item.price,
          qty: 1,
          itemNotes: item.itemNotes || "",
          customSummary: item.customSummary || "",
          emoji: item.emoji || "",
        },
      ];
    });
    setAddedItemId(item._id);
    window.clearTimeout(addToCart.timer);
    addToCart.timer = window.setTimeout(() => setAddedItemId(""), 900);
    notify(`${item.name} aggiunta`);
  }

  function removeFromCart(id) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function updateCartItemNote(id, itemNotes) {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, itemNotes } : item)),
    );
  }

  function toggleFilter(filterId) {
    setActiveFilters((current) =>
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId],
    );
    window.setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function getCartItem(itemId) {
    return cart.find((item) => item.id === itemId);
  }

  function toggleCustomPizzaTopping(toppingId) {
    setCustomPizzaToppings((current) => {
      if (current.includes(toppingId)) {
        return current.filter((id) => id !== toppingId);
      }

      if (current.length >= CUSTOM_PIZZA_MAX_TOPPINGS) {
        notify(
          `Puoi scegliere fino a ${CUSTOM_PIZZA_MAX_TOPPINGS} ingredienti.`,
        );
        return current;
      }

      return [...current, toppingId];
    });
  }

  function toggleCustomPizzaBuilder() {
    setCustomPizzaOpen((current) => {
      const next = !current;
      if (!current) {
        window.setTimeout(() => {
          customPizzaRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
      return next;
    });
  }

  function addCustomPizzaToCart() {
    if (!customPizzaBase) {
      notify("Scegli prima la base della pizza.");
      return;
    }

    const ingredientNames = customPizzaSelectedToppings.map(
      (topping) => topping.name,
    );
    const ingredientsText =
      ingredientNames.length > 0
        ? ingredientNames.join(", ")
        : "nessuna aggiunta";
    const customNotes = [
      `Base: ${customPizzaBase.name}`,
      `Ingredienti: ${ingredientsText}`,
      customPizzaNotes.trim() ? `Note: ${customPizzaNotes.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    addToCart({
      _id: `custom-pizza-${customPizzaBase.id}-${customPizzaToppings
        .slice()
        .sort()
        .join("-")}-${customPizzaNotes.trim().toLowerCase()}`,
      name: "Tonda su ordinazione",
      emoji: "\u{1F355}",
      price: Math.round(customPizzaPrice * 100) / 100,
      itemNotes: customNotes,
      customSummary: [
        customPizzaBase.name,
        ...ingredientNames,
        customPizzaNotes.trim() ? customPizzaNotes.trim() : "",
      ]
        .filter(Boolean)
        .join(" - "),
    });
    setCustomPizzaOpen(false);
  }

  function reorderLastOrder() {
    const lastItems = customerProfile?.lastOrder?.items || [];

    if (lastItems.length === 0) {
      notify("Nessun ordine precedente da riordinare.");
      return;
    }

    setCart(
      lastItems.map((item) => ({
        id: item.menuItemId || item.name,
        name: item.name,
        price: item.price,
        qty: item.qty,
        itemNotes: item.notes || item.itemNotes || "",
      })),
    );
    notify("Ultimo ordine aggiunto al carrello.");
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (!customer.trim()) return notify("Inserisci il tuo nome.");
    if (cart.length === 0) return notify("Aggiungi almeno un prodotto.");
    if (!selectedSlot) return notify("Scegli un orario di ritiro.");

    const slot = availability.slots.find(
      (item) => item.pickupSlot === selectedSlot,
    );
    if (!slot || slot.full || slot.past) {
      return notify("Questa fascia non e disponibile.");
    }

    try {
      const order = await createOrder({
        customer,
        phone,
        notes,
        pickupDate,
        pickupTime: slot.time,
        pickupSlot: slot.pickupSlot,
        items: cart.map((item) => {
          const orderItem = {
            name: item.name,
            price: item.price,
            qty: item.qty,
          };
          if (item.itemNotes?.trim()) orderItem.notes = item.itemNotes.trim();

          if (/^[a-f\d]{24}$/i.test(item.id)) {
            orderItem.menuItemId = item.id;
          }

          return orderItem;
        }),
      });

      setConfirmation(order);
      setCart([]);
      setCustomer("");
      setPhone("");
      setNotes("");
      setSelectedSlot("");
      setMobileCartOpen(false);
      setAvailability(await getAvailability(pickupDate));
    } catch (error) {
      notify(
        error.status === 409
          ? "Quel forno si e appena riempito: scegliamo un altro orario."
          : error.message,
      );
      setAvailability(await getAvailability(pickupDate).catch(() => null));
    }
  }


  return {
    activeFilters,
    activeMenu,
    activeMenuSection,
    addCustomPizzaToCart,
    addToCart,
    addedItemId,
    availability,
    cart,
    cartCount,
    confirmation,
    currentBusiness,
    customPizzaBase,
    customPizzaBaseId,
    customPizzaNotes,
    customPizzaOpen,
    customPizzaPrice,
    customPizzaRef,
    customPizzaSelectedToppings,
    customPizzaToppings,
    customer,
    customerLookupLoading,
    customerOrders,
    customerOrdersLoading,
    customerProfile,
    dateOptions,
    getCartItem,
    loading,
    loyaltyCyclePoints,
    loyaltyPoints,
    loyaltyRemaining,
    menuBySection,
    mobileCartOpen,
    normalizedPhone,
    notes,
    phone,
    pickupDate,
    removeFromCart,
    reorderLastOrder,
    searchTerm,
    selectedSlot,
    setConfirmation,
    setCustomer,
    setCustomPizzaBaseId,
    setCustomPizzaNotes,
    setMobileCartOpen,
    setNotes,
    setPhone,
    setPickupDate,
    setSearchTerm,
    setSelectedSlot,
    setActiveFilters,
    setActiveMenuSection,
    submitOrder,
    toast,
    toggleCustomPizzaBuilder,
    toggleCustomPizzaTopping,
    toggleFilter,
    total,
    updateCartItemNote,
    visibleCustomerSlots,
  };
}
