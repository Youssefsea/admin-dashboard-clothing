"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import axiosInstance from "../axios";
import { useRouter } from "next/navigation";
import { withAdminAuth } from "../middleware/adminAuth";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Autocomplete,
  Grid,
  Switch,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddBoxIcon from "@mui/icons-material/AddBox";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import RefreshIcon from "@mui/icons-material/Refresh";

const STATUS_OPTIONS = ["pending", "paid", "shipped", "delivered", "cancelled"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COMMON_COLORS = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Gray", "Purple", "Pink", "Orange", "Brown", "Gold", "Silver"];
const COMMON_CATEGORIES = ["Shirt", "Pants", "Jacket", "Dress", "T-shirt", "Jeans", "Shoes", "Bag", "Watch", "Glasses", "Accessories"];

function AdminPage() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [errorMsg, setErrorMsg] = useState("");

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    category_name: "",
    discount: "",
    stock: "",
    sizes: ["M"],
    colors: [],
    is_active: 1,
    image: null,
    id: null,
  });
  const [productError, setProductError] = useState("");

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const [colorSuggestions, setColorSuggestions] = useState(COMMON_COLORS);
  const [categorySuggestions, setCategorySuggestions] = useState(COMMON_CATEGORIES);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axiosInstance.get("/admin/users");
        loadAll();
      } catch (err) {
        console.error("Admin auth failed:", err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          router.push("/unauthorized");
        } else {
          setErrorMsg("فشل التحقق من الصلاحيات. تأكد أنك مسجل كأدمن.");
        }
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    const existingColors = products
      .flatMap(p => {
        if (Array.isArray(p.colors)) return p.colors;
        if (typeof p.colors === 'string' && p.colors) {
          return p.colors.split(',').map(c => c.trim()).filter(Boolean);
        }
        return [];
      })
      .filter(Boolean)
      .map(color => color.trim())
      .filter((color, index, arr) => arr.indexOf(color) === index); // إزالة التكرار

    const allColors = [...new Set([...COMMON_COLORS, ...existingColors])].sort();
    setColorSuggestions(allColors);

    const existingCategories = products
      .map(p => p.category_name)
      .filter(Boolean)
      .filter((category, index, arr) => arr.indexOf(category) === index); // إزالة التكرار

    const allCategories = [...new Set([...COMMON_CATEGORIES, ...existingCategories])].sort();
    setCategorySuggestions(allCategories);
  }, [products]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [prodRes, ordRes, usersRes] = await Promise.all([
        axiosInstance.get("/products"),
        axiosInstance.get("/admin/orders"),
        axiosInstance.get("/admin/users"),
      ]);

      const rawProds =
        prodRes?.data?.allProducts ??
    [];

      const rawOrds =
        ordRes?.data?.orders ?? [];

      const rawUsers =
        usersRes?.data?.users ?? [];

      const prodsArray = Array.isArray(rawProds)
        ? rawProds
        : Array.isArray(rawProds[0])
        ? rawProds[0]
        : [];

      const ordsArray = Array.isArray(rawOrds)
        ? 
          Array.isArray(rawOrds[0])
          ? rawOrds[0]
          : rawOrds
        : [];

      const usersArray = Array.isArray(rawUsers)
        ? Array.isArray(rawUsers[0])
          ? rawUsers[0]
          : rawUsers
        : [];

      const normalizedProds = (prodsArray || []).map((p) => ({
        ...p,
        sizes:
          p.sizes && typeof p.sizes === "string"
            ? p.sizes.split(",").map((s) => s.trim()).filter(Boolean)
            : Array.isArray(p.sizes)
            ? p.sizes
            : p.size
            ? [String(p.size)]
            : [],
        colors:
          p.colors && typeof p.colors === "string"
            ? p.colors.split(",").map((c) => c.trim()).filter(Boolean)
            : Array.isArray(p.colors)
            ? p.colors
            : p.colors == null
            ? []
            : ("" + p.colors).split(",").map((c) => c.trim()).filter(Boolean),
        is_active: p.is_active == null ? 1 : Number(p.is_active),
      }));

      setProducts(normalizedProds);
      setOrders(ordsArray);
      setUsers(usersArray);
    } catch (err) {
      console.error(err);
      setErrorMsg("فشل جلب البيانات. تأكد أنك مسجل كأدمن أو أن السيرفر شغال.");
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        router.push("/unauthorized");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);


  function ProductImage({ image_url, title, size = 60 }) {
  const images = image_url ? image_url.split(",").map((img) => img.trim()) : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return; 

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000); 

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          borderRadius: "6px",
        }}
      >
        <Typography fontSize={10} color="#777">
          لا توجد صورة
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: "relative",
        overflow: "hidden",
        borderRadius: "6px",
      }}
    >
      <Box
        component="img"
        src={images[currentIndex]}
        alt={title}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "opacity 0.5s ease-in-out",
        }}
      />
    </Box>
  );
}

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      title: "",
      description: "",
      price: "",
      category_name: "",
      discount: "",
      stock: "",
      sizes: ["M"],
      colors: [],
      is_active: 1,
      image: null,
      id: null,
    });
    setProductError("");
    setProductDialogOpen(true);
    if (fileRef.current) fileRef.current.value = null;
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      title: p.title ?? "",
      description: p.description ?? "",
      price: p.price ?? "",
      category_name: p.category_name ?? "",
      discount: p.discount ?? 0,
      stock: p.stock ?? 0,
      sizes: Array.isArray(p.sizes) ? p.sizes : p.size ? [p.size] : ["M"],
      colors: Array.isArray(p.colors) ? p.colors : p.colors ? ("" + p.colors).split(",").map(c => c.trim()) : [],
      is_active: Number(p.is_active) || 0,
      image: null,
      id: p.id,
    });
    setProductError("");
    setProductDialogOpen(true);
    if (fileRef.current) fileRef.current.value = null;
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
    setEditingProduct(null);
    setProductError("");
  };

  const handleProductFormChange = (key, value) => {
    setProductForm((s) => ({ ...s, [key]: value }));
  };
  const submitProduct = async () => {
    if (!productForm.title || !productForm.price || !productForm.category_name) {
      setProductError("أملأ الحقول المطلوبة: العنوان، السعر، القسم.");
      return;
    }
    setActionLoading(true);
    setProductError("");
    try {
      const fd = new FormData();
      fd.append("title", productForm.title);
      fd.append("description", productForm.description || "");
      fd.append("price", productForm.price);
      fd.append("category_name", productForm.category_name);
      fd.append("sizes", (productForm.sizes || []).join(","));
      fd.append("colors", (productForm.colors || []).join(","));
      fd.append("discount", productForm.discount || 0);
      fd.append("stock", productForm.stock || 0);
      fd.append("is_active", productForm.is_active ? "1" : "0");
  
      if (productForm.images && productForm.images.length > 0) {
        for (let i = 0; i < productForm.images.length; i++) {
          fd.append("images", productForm.images[i]); // <-- backend expects this key
        }
      }
  
      if (editingProduct) {
        fd.append("id", productForm.id);
        await axiosInstance.put("/products/update", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosInstance.post("/products/add", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
  
      await loadAll();
      closeProductDialog();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "فشل حفظ المنتج. تأكد من البيانات وحاول مرة أخرى.";
      setProductError(msg);
    } finally {
      setActionLoading(false);
    }
  };
  

  const toggleProductActive = async (p) => {
    try {
      setActionLoading(true);
      await axiosInstance.put("/products/toggle", { id: p.id });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x)));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "فشل تبديل حالة المنتج");
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };
  const closeOrderDialog = () => {
    setSelectedOrder(null);
    setOrderDialogOpen(false);
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      setActionLoading(true);
      await axiosInstance.put("/admin/orders/status", { order_id: orderId, status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "فشل تحديث حالة الطلب");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("هل تريد حذف المستخدم؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    try {
      setActionLoading(true);
      await axiosInstance.delete("/admin/users/delete", { data: { user_id: userId } });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "فشل حذف المستخدم");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts =
    !productSearch
      ? products
      : products.filter(
          (p) =>
            (p.title || "").toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.category_name || "").toLowerCase().includes(productSearch.toLowerCase()) ||
            String(p.id) === productSearch
        );

  const filteredOrders =
    !orderSearch
      ? orders
      : orders.filter(
          (o) =>
            (o.customer_name || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
            (o.customer_email || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
            String(o.id) === orderSearch
        );

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      py: 6, 
      bgcolor: "#f5f7fb",
      '& .MuiAutocomplete-popper': {
        zIndex: '10000 !important',
      },
      '& .MuiAutocomplete-listbox': {
        maxHeight: '200px !important',
        overflow: 'auto !important',
      },
      '& .MuiMenu-paper': {
        zIndex: '10000 !important',
      },
      '& .MuiDialog-root': {
        zIndex: '1300 !important',
      }
    }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack>
              <Typography variant="h5">Admin Panel</Typography>
              <Typography variant="body2" color="text.secondary">
                عرض وتعديل المنتجات والطلبات والمستخدمين
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Tooltip title="تحديث البيانات">
                <IconButton onClick={loadAll} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Button variant="contained" startIcon={<AddBoxIcon />} onClick={openAddProduct}>
                إضافة منتج
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => router.push("/")}>
                العودة للرئيسية
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {errorMsg && (
          <Paper sx={{ p: 2, mb: 4, bgcolor: "#ffefef" }}>
            <Typography color="error">{errorMsg}</Typography>
          </Paper>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} indicatorColor="primary" textColor="primary">
            <Tab label="Products" />
            <Tab label="Orders" />
            <Tab label="Users" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
                <TextField
                  size="small"
                  placeholder="بحث بالاسم، القسم   "
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 400 } }}
                />
              </Stack>
            </Paper>
            
            <TableContainer component={Paper}>
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>#</TableCell>
        <TableCell>صورة</TableCell>
        <TableCell>العنوان</TableCell>
        <TableCell>القسم</TableCell>
        <TableCell>السعر</TableCell>
        <TableCell>الخصم</TableCell>
        <TableCell>المخزون</TableCell>
        <TableCell>الأحجام</TableCell>
        <TableCell>الألوان</TableCell>
        <TableCell>نشط</TableCell>
        <TableCell align="center">إجراءات</TableCell>
      </TableRow>
    </TableHead>

    <TableBody>
      {filteredProducts.length === 0 ? (
        <TableRow>
          <TableCell colSpan={11} align="center">
            لا توجد منتجات
          </TableCell>
        </TableRow>
      ) : (
        filteredProducts.map((p, idx) => {
          const imgs = p.image_url ? p.image_url.split(",") : [];
     
          return (
            <TableRow key={p.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>
                {imgs.length > 0 ? (
                <ProductImage image_url={p.image_url} title={p.title} size={60} />

                ) : (
                  <Box sx={{ width: 60, height: 60, bgcolor: "#eee", borderRadius: 1 }} />
                )}
              </TableCell>
              <TableCell>{p.title}</TableCell>
              <TableCell>{p.category_name}</TableCell>
              <TableCell>${p.price}</TableCell>
              <TableCell>{p.discount ?? 0}%</TableCell>
              <TableCell>{p.stock}</TableCell>
              <TableCell>
                {(p.sizes || []).map((s) => (
                  <Chip key={s} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </TableCell>
              <TableCell>
                {(p.colors || []).map((c) => (
                  <Chip key={c} label={c} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </TableCell>
              <TableCell>
                <Tooltip title={p.is_active ? "نشط" : "غير نشط"}>
                  <IconButton onClick={() => toggleProductActive(p)} size="small">
                    {p.is_active ? <ToggleOnIcon color="success" /> : <ToggleOffIcon color="disabled" />}
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEditProduct(p)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => alert(JSON.stringify(p, null, 2))}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
</TableContainer>



          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
                <TextField
                  size="small"
                  placeholder="بحث  الايميل أو رقم الطلب"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 400 } }}
                />
              </Stack>
            </Paper>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الطلب</TableCell>
                    <TableCell>العميل</TableCell>
                    <TableCell>الايميل</TableCell>
                    <TableCell>الهاتف</TableCell>
                    <TableCell>اسكرين الدفع </TableCell>
                    <TableCell>العنوان</TableCell>


                    <TableCell>المبلغ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        لا توجد طلبات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.id}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell>{o.customer_email}</TableCell>
                        <TableCell>{o.customer_phone}</TableCell>
                        <TableCell>{o.payment_screenshot}</TableCell>
                        <TableCell>{o.address}</TableCell>
                        <TableCell>${o.total ?? 0}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select 
                              value={o.status || "pending"} 
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    maxHeight: 200,
                                    overflow: 'auto',
                                  },
                                },
                                anchorOrigin: {
                                  vertical: 'bottom',
                                  horizontal: 'left',
                                },
                                transformOrigin: {
                                  vertical: 'top',
                                  horizontal: 'left',
                                },
                                style: {
                                  zIndex: 10000
                                }
                              }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {s}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="تفاصيل الطلب">
                              <IconButton size="small" onClick={() => openOrderDetails(o)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
                <Typography>المستخدمين ({users.length})</Typography>
              </Stack>
            </Paper>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell>الايميل</TableCell>
                    <TableCell>الهاتف</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        لا يوجد مستخدمين
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.phone}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="عرض">
                              <IconButton size="small" onClick={() => alert(JSON.stringify(u, null, 2))}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف المستخدم">
                              <IconButton size="small" color="error" onClick={() => deleteUser(u.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Product Dialog */}
        <Dialog 
          open={productDialogOpen} 
          onClose={closeProductDialog} 
          fullWidth 
          maxWidth="lg"
          sx={{
            zIndex: 1400,
            '& .MuiDialog-paper': {
              maxHeight: '90vh',
              overflow: 'visible',
              position: 'relative'
            },
            '& .MuiDialogContent-root': {
              overflow: 'visible',
              paddingBottom: 4
            }
          }}
        >
          <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج"}</DialogTitle>
          <DialogContent 
            dividers 
            sx={{ 
              overflow: 'visible !important',
              paddingBottom: 4,
              position: 'relative'
            }}
          >
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField label="العنوان" fullWidth value={productForm.title} onChange={(e) => handleProductFormChange("title", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={categorySuggestions}
                  value={productForm.category_name}
                  onChange={(_, v) => handleProductFormChange("category_name", v || "")}
                  onInputChange={(_, v) => handleProductFormChange("category_name", v)}
                  slotProps={{ 
                    popper: { 
                      sx: { 
                        zIndex: 10000,
                        '& .MuiAutocomplete-listbox': {
                          maxHeight: '200px',
                          overflow: 'auto'
                        },
                        '& .MuiPaper-root': {
                          maxHeight: '220px'
                        }
                      },
                      placement: 'bottom-start',
                      disablePortal: false,
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altAxis: true,
                            altBoundary: true,
                            tether: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ]
                    } 
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      overflow: 'auto'
                    }
                  }}
                  renderInput={(params) => <TextField {...params} label="القسم" placeholder="اختر من الأقسام الموجودة أو اكتب قسم جديد" />}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ mr: 1 }}>📁</Box>
                      {option}
                    </Box>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField label="السعر" fullWidth value={productForm.price} onChange={(e) => handleProductFormChange("price", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="الخصم (%)" fullWidth value={productForm.discount} onChange={(e) => handleProductFormChange("discount", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="المخزون" fullWidth value={productForm.stock} onChange={(e) => handleProductFormChange("stock", e.target.value)} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={SIZE_OPTIONS}
                  value={productForm.sizes}
                  onChange={(_, v) => handleProductFormChange("sizes", v)}
                  slotProps={{ 
                    popper: { 
                      sx: { 
                        zIndex: 10000,
                        '& .MuiAutocomplete-listbox': {
                          maxHeight: '200px',
                          overflow: 'auto'
                        },
                        '& .MuiPaper-root': {
                          maxHeight: '220px'
                        }
                      },
                      placement: 'bottom-start',
                      disablePortal: false,
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altAxis: true,
                            altBoundary: true,
                            tether: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ]
                    } 
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      overflow: 'auto'
                    }
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => <Chip key={option + index} label={option} {...getTagProps({ index })} />)
                  }
                  renderInput={(params) => <TextField {...params} label="الأحجام" placeholder="أضف/اختَر أحجام" />}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  fullWidth
                  options={colorSuggestions}
                  value={productForm.colors}
                  onChange={(_, v) => handleProductFormChange("colors", v)}
                  filterSelectedOptions
                  slotProps={{ 
                    popper: { 
                      sx: { 
                        zIndex: 10000,
                        '& .MuiAutocomplete-listbox': {
                          maxHeight: '300px',
                          overflow: 'auto'
                        },
                        '& .MuiPaper-root': {
                          maxHeight: '320px'
                        }
                      },
                      placement: 'bottom-start',
                      disablePortal: false,
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altAxis: true,
                            altBoundary: true,
                            tether: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ]
                    } 
                  }}
                  ListboxProps={{ 
                    style: { 
                      maxHeight: 300,
                      overflow: 'auto'
                    } 
                  }}
                  renderTags={(value, getTagProps) => {
                    const getColorValue = (colorName) => {
                      const colorMap = {
                        'أحمر': '#f44336',
                        'أزرق': '#2196f3',
                        'أخضر': '#4caf50',
                        'أسود': '#000000',
                        'أبيض': '#ffffff',
                        'أصفر': '#ffeb3b',
                        'رمادي': '#9e9e9e',
                        'بنفسجي': '#9c27b0',
                        'وردي': '#e91e63',
                        'برتقالي': '#ff9800',
                        'بني': '#795548',
                        'ذهبي': '#ffd700',
                        'فضي': '#c0c0c0'
                      };
                      return colorMap[colorName] || '#e0e0e0';
                    };
                    return value.map((option, index) => (
                      <Chip
                        key={option + index}
                        label={option}
                        icon={<Box sx={{ width: 12, height: 12, bgcolor: getColorValue(option), borderRadius: '50%', mr: 0.5, border: '1px solid #ccc' }} />}
                        {...getTagProps({ index })}
                      />
                    ));
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth label="الألوان" placeholder="اختر من الألوان الموجودة أو اكتب لون جديد" />}
                  renderOption={(props, option) => {
                    const getColorValue = (colorName) => {
                      const colorMap = {
                        'أحمر': '#f44336',
                        'أزرق': '#2196f3',
                        'أخضر': '#4caf50',
                        'أسود': '#000000',
                        'أبيض': '#ffffff',
                        'أصفر': '#ffeb3b',
                        'رمادي': '#9e9e9e',
                        'بنفسجي': '#9c27b0',
                        'وردي': '#e91e63',
                        'برتقالي': '#ff9800',
                        'بني': '#795548',
                        'ذهبي': '#ffd700',
                        'فضي': '#c0c0c0'
                      };
                      return colorMap[colorName] || '#e0e0e0';
                    };

                    return (
                      <Box component="li" {...props}>
                        <Box 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            bgcolor: getColorValue(option), 
                            borderRadius: '50%', 
                            mr: 1, 
                            border: '1px solid #ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }} 
                        />
                        {option}
                      </Box>
                    );
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField multiline rows={4} fullWidth label="الوصف" value={productForm.description} onChange={(e) => handleProductFormChange("description", e.target.value)} />
              </Grid>

              <Grid item xs={12}>
  <Button
    variant="outlined"
    component="label"
    fullWidth
  >
    رفع صور المنتج (حتى 5 صور)
    <input
      type="file"
      multiple
      accept="image/*"
      hidden
      ref={fileRef}
      onChange={(e) => handleProductFormChange("images", Array.from(e.target.files))}
    />
  </Button>
  {productForm.images && productForm.images.length > 0 && (
    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
      {productForm.images.map((file, idx) => (
        <Typography key={idx} variant="body2">{file.name}</Typography>
      ))}
    </Stack>
  )}
</Grid>


              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
                  <Typography variant="body2">نشط</Typography>
                  <Switch checked={Boolean(productForm.is_active)} onChange={(e) => handleProductFormChange("is_active", e.target.checked ? 1 : 0)} />
                </Stack>
              </Grid>

              {productError && (
                <Grid item xs={12}>
                  <Typography color="error">{productError}</Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeProductDialog}>إلغاء</Button>
            <Button onClick={submitProduct} disabled={actionLoading} variant="contained">
              {editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Order Dialog */}
        <Dialog open={orderDialogOpen} onClose={closeOrderDialog} maxWidth="md" fullWidth>
          <DialogTitle>تفاصيل الطلب #{selectedOrder?.id}</DialogTitle>
          <DialogContent dividers>
            {selectedOrder ? (
              <Box component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedOrder, null, 2)}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeOrderDialog}>إغلاق</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default withAdminAuth(AdminPage);