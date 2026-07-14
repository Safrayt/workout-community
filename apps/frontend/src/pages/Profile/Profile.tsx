// import Section from "../../components/ui/Section/Section";
// import Input from "../../components/ui/Input/Input";
// import Button from "../../components/ui/Button/Button";
// import Select from "../../components/ui/Select/Select";


// export default function Profile() {
//     return (
//         <Section title="Профиль">
//             <Input
//                 id="name"
//                 label="Имя"
//                 placeholder="Введите имя"
//             />

//             <Input
//                 id="city"
//                 label="Город"
//                 placeholder="Например, Минск"
//             />
            
//             <Select
//                 id="level"
//                 label="Уровень подготовки"
//                 options={[
//                     { value: "beginner", label: "Новичок" },
//                     { value: "intermediate", label: "Средний" },
//                     { value: "advanced", label: "Продвинутый" },
//                 ]}
//             />            

//             <Button>
//                 Сохранить
//             </Button>
//         </Section>
//     );
// }

import Section from "../../components/ui/Section/Section";

import { users } from "../../data/users";

import { getUserLevel } from "../../utils/level";

export default function Profile() {
    const user = users[0];

    return (
        <Section title="Профиль">
            <h2>{user.name}</h2>

            <p>{user.nickname}</p>

            <p>Населённый пункт: {user.locality}</p>

            <p>{user.bio}</p>

            <p>Уровень: {getUserLevel(user.experience)}</p>

            <p>Опыт: {user.experience} XP</p>
        </Section>
    );
}